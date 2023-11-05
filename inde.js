import chromium from "@sparticuz/chromium";
import dotenv from 'dotenv';
import puppeteer from "puppeteer-core";
// import fetch from "node-fetch";
dotenv.config();
import rp from "request-promise";

import AWS from "aws-sdk";
import fs from "fs";
import envVariables from "./env-variables.json" assert { type: "json" };;

const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN, REGION } = envVariables;
// console.log(JSON.stringify({ AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN }))
let accessKeyId = null;
let secretAccessKey = null;
let sessionToken = null;
let cookie = null;
let xsrftoken = null;

async function login(page) {
    try {
        const ENDPOINT = 'https://signin.aws.amazon.com/federation?Action=getSigninToken&Session=' + encodeURIComponent(JSON.stringify({
            'sessionId': AWS_ACCESS_KEY_ID,
            'sessionKey': AWS_SECRET_ACCESS_KEY,
            'sessionToken': AWS_SESSION_TOKEN,
        }));
        console.log({ ENDPOINT })

        let signintoken = await rp(ENDPOINT);
        console.log({ signintoken });
        // console.log(">>>>>>", 'https://signin.aws.amazon.com/federation?Action=login&Destination=https%3A%2F%2Fconsole.aws.amazon.com%2F&SigninToken=' + JSON.parse(signintoken)['SigninToken'])
        if (signintoken) {
            await page.goto('https://signin.aws.amazon.com/federation?Action=login&Destination=https%3A%2F%2Fconsole.aws.amazon.com%2F&SigninToken='
                + JSON.parse(signintoken)['SigninToken'], {
                timeout: 0,
                waitUntil: ['domcontentloaded']
            });

            await page.goto('https://console.aws.amazon.com/billing/home?#/bills', {
                timeout: 0,
                waitUntil: ['domcontentloaded']
            });

            const cookies = await page.cookies();
            // console.log({ cookies });
            cookie = "";
            cookies.forEach(cookieitem => {
                cookie += cookieitem['name'] + "=" + cookieitem['value'] + "; ";
            });
            cookie = cookie.substr(0, cookie.length - 2);

            // console.log({ cookie })

            xsrftoken = await page.$eval('#xsrfToken', element => element.value);
            // console.log({ xsrftoken });
        } else {
            throw new Error("Signin Token Fail");
        }

    } catch (error) {
        console.log(error.message);
        throw error;
    }
}

async function getCompleteBill(params) {
    if (cookie && xsrftoken) {
        try {
            if (!params.month.match(/^[0-9]+$/g) || !params.year.match(/^[0-9]+$/g)) {
                return {}
            }

            let res = await rp({
                uri: 'https://console.aws.amazon.com/billing/rest/v1.0/bill/completebill?month=' + params.month + '&year=' + params.year,
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'x-AWSBillingConsole-Region': REGION,
                    'x-awsbc-xsrf-token': xsrftoken,
                    'cookie': cookie
                }
            });
            fs.writeFileSync('./bill.json', res);
            return JSON.parse(res);
        } catch (error) {
            throw error;
        }
    } else {
        throw new Error("No available cookie or/and xsrftoken");
    }
}

async function getInvoiceList(params) {
    if (cookie && xsrftoken) {
        if (!params.month.match(/^[0-9]+$/g) || !params.year.match(/^[0-9]+$/g)) {
            return {}
        }

        try {
            let res = await rp({
                uri: 'https://console.aws.amazon.com/billing/rest/v1.0/bill/invoice/list?month=' + params.month + '&year=' + params.year,
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'x-AWSBillingConsole-Region': REGION,
                    'x-awsbc-xsrf-token': xsrftoken,
                    'cookie': cookie
                }
            });
            fs.writeFileSync('./invoice.json', res);
            return JSON.parse(res);
        } catch (error) {
            throw error;
        }
    } else {
        throw new Error("No available cookie or/and xsrftoken")
    }
}

async function getLinkedAccountBillSummary(params) {
    if (!params.month.match(/^[0-9]+$/g) || !params.year.match(/^[0-9]+$/g)) {
        return {}
    }

    let res = await rp({
        uri: 'https://console.aws.amazon.com/billing/rest/v1.0/bill/linked/accountbillsummary?month=' + params.month + '&timestamp=' + Math.round(Date.now() / 1000).toString() + '&year=' + params.year,
        headers: {
            'accept': 'application/json, text/plain, */*',
            'x-AWSBillingConsole-Region': REGION,
            'x-awsbc-xsrf-token': xsrftoken,
            'cookie': cookie
        }
    });

    fs.writeFileSync('./bill-summary.json', res);
    return JSON.parse(res);
}

async function getGenerate(params) {
    if (cookie && xsrftoken) {
        if (params.invoiceNumber.match(/^[0-9A-Z-]+$/g) || !params.invoiceGroupId.match(/^[0-9A-Z-]+$/g)) {
            return {};
        }

        let res = await rp({
            uri: 'https://us-east-1.console.aws.amazon.com/billing/rest/v1.0/bill/invoice/generate?invoicenumber=' + params.invoiceNumber + '&invoiceGroupId=' + params.invoiceGroupId + '&generatenew=true',
            headers: {
                'accept': 'application/json, text/plain, */*',
                'x-AWSBillingConsole-Region': REGION,
                'x-awsbc-xsrf-token': xsrftoken,
                'cookie': cookie
            }
        });

        return JSON.parse(res);
    } else {
        throw new Error("No available cookie or/and xsrftoken");
    }
}
async function getDownload(params) {
    if (!params.invoiceNumber.match(/^[0-9A-Z-]+$/g) || !params.invoiceGroupId.match(/^[0-9A-Z-]+$/g)) {
        return;
    }

    let buf = await rp({
        uri: 'https://us-east-1.console.aws.amazon.com/billing/rest/v1.0/bill/invoice/download?invoicenumber=' + params.invoiceNumber + '&invoiceGroupId=' + params.invoiceGroupId,
        encoding: null,
        headers: {
            'accept': 'application/json, text/plain, */*',
            'x-AWSBillingConsole-Region': REGION,
            'x-awsbc-xsrf-token': xsrftoken,
            'cookie': cookie
        }
    });

    return buf;
}
const main = async (event, context) => {
    // console.log("Event:", { event });
    //     const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN } = event;
    let browser = null, page = null;
    try {
        let resp = {
            "error": "No valid method called"
        }

        browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                "--hide-scrollbars",
                "--disable-web-security",
                // "--proxy-server=127.0.0.1",
                // '--proxy-bypass-list=<-loopback>',
            ],
            headless: true,
            ignoreHTTPSErrors: true,
            defaultViewport: chromium.defaultViewport,
            // executablePath: await chromium.executablePath(),
            executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
        });

        page = await browser.newPage();

        await login(page);

        let contentType = "application/json";
        let isBase64Encoded = false;

        await getCompleteBill({ month: "10", year: "2023" });
        // await getInvoiceList({ month: "08", year: "2023" });
        // await getLinkedAccountBillSummary({ month: '08', year: "2023" });

        // let body = JSON.stringify(resp)
        // await page.close();
        // await browser.close();
        return {
            "statusCode": 200,
            "isBase64Encoded": isBase64Encoded,
            "headers": {
                "Content-Type": contentType,
            },
            // "body": JSON.stringify(resp),
        };


    } catch (error) {
        console.log(error.message);
        if (page) await page.close();
    }
    finally {
        if (page) await page.close();
    }
};

const result = await main(null, null);