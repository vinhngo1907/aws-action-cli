// install aws-sdk
// npm i aws-sdk

import { S3 } from 'aws-sdk'
// import { S3Client } from '@aws-sdk/client-s3'

const s3Client2 = new S3()
// const s3Client3 = new S3Client({ region: "ap-southeast-1" })

const handler = async (event: any, context: any) => {
    const listBuckets = await s3Client2.listBuckets().promise()
    console.log("I got an event")
    return {
        statusCode: 200,
        body: JSON.stringify('Here is the buckets: ' + JSON.stringify(listBuckets.Buckets))
    }
}
export { handler }