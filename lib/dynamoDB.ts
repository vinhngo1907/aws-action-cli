import { RemovalPolicy, Stack } from "aws-cdk-lib"
import {AttributeType, BillingMode, Table} from 'aws-cdk-lib/aws-dynamodb'


export class DynamodbTable{
    private tableName : string
    private PK : string 
    private stack : Stack
    private table : Table

    constructor(stack: Stack, name: string, PK: string){
        this.tableName = name 
        this.PK = PK
        this.stack = stack
        this.init()
    }
    private init(){
        this.createTable()
    }
    private createTable(){
        this.table = new Table(this.stack, this.tableName,{
            partitionKey:{
                name: this.PK, 
                type: AttributeType.STRING
            },
            billingMode: BillingMode.PAY_PER_REQUEST,
            removalPolicy: RemovalPolicy.DESTROY
        })
    }
}