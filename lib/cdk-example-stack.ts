import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Bucket } from 'aws-cdk-lib/aws-s3'
import { CfnOutput, CfnParameter, Duration, RemovalPolicy} from 'aws-cdk-lib'
import { Architecture, Code, Function, FunctionBase, Runtime } from 'aws-cdk-lib/aws-lambda';
import {join} from 'path'
import { Integration, LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { DynamodbTable } from './dynamoDB';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

export class FirstCdkStack extends cdk.Stack {
  private apiCdk = new RestApi(this, 'apiCdk')
  private myTable = new DynamodbTable(this, 'first-cdk-ddb', 'id')
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const expiredDuration = new CfnParameter(this, 'expiredDuration', {
      type: 'Number',
      default: 6,
      minValue: 3,
      maxValue: 10
    })

    // cdk deploy FirstCdkStack --parameters expiredDuration=12

    // cdk deploy FirstCdkStack --parameters expiredDuration=12 --parameters param2=viet

    const myBucket = new Bucket(this, 'vietaws-bucket',{
      lifecycleRules:[
        {
          expiration: Duration.days(expiredDuration.valueAsNumber),
        }
      ],
      removalPolicy: RemovalPolicy.DESTROY
    })

    new CfnOutput(this, 'vietaws-bucket-name',{
      value: myBucket.bucketName
    })

    //JS Lambda
    const helloLambda = new Function(this, 'helloLambda',{
      code: Code.fromAsset(join(__dirname, '..', 'lambdas', 'hello')),
      handler: 'hello.handler',
      runtime: Runtime.NODEJS_18_X,
      architecture: Architecture.ARM_64,
      memorySize: 512,
      timeout: Duration.minutes(5)
    })
    const helloIntegration = new LambdaIntegration(helloLambda)

    //TS Lambda
    const helloTsLambda = new NodejsFunction(this, 'hello-ts', {
      entry: join(__dirname, '..', 'lambdas', 'hello-ts', 'hello.ts'),
      handler: 'handler'
    })
    const helloTsIntegration = new LambdaIntegration(helloTsLambda)
    
    //Python Lambda
    const helloPy = new Function(this, 'lambdaPy', {
      code: Code.fromAsset(join(__dirname, '..', 'lambdas', 'hello-py')),
      handler: 'hello.handler',
      runtime: Runtime.PYTHON_3_9
    })
    const helloPyIntegration = new LambdaIntegration(helloPy)

    //list s3 bucket
    const s3Lambda = new NodejsFunction(this, 's3lambda', {
      entry: join(__dirname, '..', 'lambdas', 'list-bucket', 'index.ts'),
      handler: 'handler',
      // runtime: Runtime.NODEJS_18_X,
      runtime: Runtime.NODEJS_16_X,
      timeout: Duration.minutes(1)
    })
    const s3LambdaIntegration = new LambdaIntegration(s3Lambda)

    //add policy
    const s3ListPolicy = new PolicyStatement()
    s3ListPolicy.addActions('s3:ListAllMyBuckets')
    s3ListPolicy.addResources('*')
    s3Lambda.addToRolePolicy(s3ListPolicy)
    

    
    const s3LambdaResource = this.apiCdk.root.addResource('s3-lambda')
    s3LambdaResource.addMethod('GET', s3LambdaIntegration)
    const helloResource = this.apiCdk.root.addResource('hello')
    helloResource.addMethod('GET', helloIntegration)
    const helloTSResource = this.apiCdk.root.addResource('hello-ts')
    helloTSResource.addMethod('GET', helloTsIntegration)

    const helloPyResource = this.apiCdk.root.addResource('hello-py')
    helloPyResource.addMethod('GET', helloPyIntegration)


  }
}
