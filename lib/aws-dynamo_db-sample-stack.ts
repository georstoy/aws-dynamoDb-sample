import cdk = require('@aws-cdk/core');
import ec2 = require("@aws-cdk/aws-ec2");
import { IVpc } from "@aws-cdk/aws-ec2";
import lambda = require("@aws-cdk/aws-lambda");
import dynamoDb = require("@aws-cdk/aws-dynamodb");
import apigateway = require('@aws-cdk/aws-apigateway');
export class AwsDynamoDbSampleStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpcCidr = "10.0.0.0/21";
    const port = 27017;

    /**
     * Network
     */
    const vpc: IVpc = new ec2.Vpc(this, "sample-vpc", {
      cidr: vpcCidr,
      subnetConfiguration: [
        {
          subnetType: ec2.SubnetType.PRIVATE,
          cidrMask: 24,
          name: "sample-vpc-PrivateSubnet1"
        },
        {
          subnetType: ec2.SubnetType.PRIVATE,
          cidrMask: 24,
          name: "sample-vpc-PrivateSubnet2"
        },
        {
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 28,
          name: "sample-vpc-PublicSubnet1"
        }
      ]
    });

    const sg = new ec2.SecurityGroup(this, "sample-sg", {
      vpc,
      securityGroupName: "sample-sg"
    });

    /**
     * Storage
     */
    const dynamoTable = new dynamoDb.Table(this, 'items', {
      partitionKey: {
        name: 'itemId',
        type: dynamoDb.AttributeType.STRING
      },
      tableName: 'items',

      // The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
      // the new table, and it will remain in your account until manually deleted. By setting the policy to 
      // DESTROY, cdk destroy will delete the table (even if it has data in it)
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    /**
     * Handlers/Controllers
     */
    const getOneLambda = new lambda.Function(this, 'getOneItemFunction', {
      code: new lambda.AssetCode('src'),
      handler: 'get-one.handler',
      runtime: lambda.Runtime.NODEJS_10_X,
      environment: {
        TABLE_NAME: dynamoTable.tableName,
        PRIMARY_KEY: 'itemId'
      }
    });

    const getAllLambda = new lambda.Function(this, 'getAllItemsFunction', {
      code: new lambda.AssetCode('src'),
      handler: 'get-all.handler',
      runtime: lambda.Runtime.NODEJS_10_X,
      environment: {
        TABLE_NAME: dynamoTable.tableName,
        PRIMARY_KEY: 'itemId'
      }
    });

    const createOne = new lambda.Function(this, 'createItemFunction', {
      code: new lambda.AssetCode('src'),
      handler: 'create.handler',
      runtime: lambda.Runtime.NODEJS_10_X,
      environment: {
        TABLE_NAME: dynamoTable.tableName,
        PRIMARY_KEY: 'itemId'
      }
    });

    const updateOne = new lambda.Function(this, 'updateItemFunction', {
      code: new lambda.AssetCode('src'),
      handler: 'update-one.handler',
      runtime: lambda.Runtime.NODEJS_10_X,
      environment: {
        TABLE_NAME: dynamoTable.tableName,
        PRIMARY_KEY: 'itemId'
      }
    });

    const deleteOne = new lambda.Function(this, 'deleteItemFunction', {
      code: new lambda.AssetCode('src'),
      handler: 'delete-one.handler',
      runtime: lambda.Runtime.NODEJS_10_X,
      environment: {
        TABLE_NAME: dynamoTable.tableName,
        PRIMARY_KEY: 'itemId'
      }
    });

    dynamoTable.grantReadWriteData(getAllLambda);
    dynamoTable.grantReadWriteData(getOneLambda);
    dynamoTable.grantReadWriteData(createOne);
    dynamoTable.grantReadWriteData(updateOne);
    dynamoTable.grantReadWriteData(deleteOne);

    /**
     * Routing
     */
    const api = new apigateway.RestApi(this, 'itemsApi', {
      restApiName: 'Items Service'
    });

    const items = api.root.addResource('items');
    const getAllIntegration = new apigateway.LambdaIntegration(getAllLambda);
    items.addMethod('GET', getAllIntegration);

    const createOneIntegration = new apigateway.LambdaIntegration(createOne);
    items.addMethod('POST', createOneIntegration);
    addCorsOptions(items);

    const singleItem = items.addResource('{id}');
    const getOneIntegration = new apigateway.LambdaIntegration(getOneLambda);
    singleItem.addMethod('GET', getOneIntegration);

    const updateOneIntegration = new apigateway.LambdaIntegration(updateOne);
    singleItem.addMethod('PATCH', updateOneIntegration);

    const deleteOneIntegration = new apigateway.LambdaIntegration(deleteOne);
    singleItem.addMethod('DELETE', deleteOneIntegration);
    addCorsOptions(singleItem);

  }
}

export function addCorsOptions(apiResource: apigateway.IResource) {
  apiResource.addMethod('OPTIONS', new apigateway.MockIntegration({
    integrationResponses: [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
        'method.response.header.Access-Control-Allow-Origin': "'*'",
        'method.response.header.Access-Control-Allow-Credentials': "'false'",
        'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
      },
    }],
    passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
    requestTemplates: {
      "application/json": "{\"statusCode\": 200}"
    },
  }), {
    methodResponses: [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': true,
        'method.response.header.Access-Control-Allow-Methods': true,
        'method.response.header.Access-Control-Allow-Credentials': true,
        'method.response.header.Access-Control-Allow-Origin': true,
      },  
    }]
  })
}