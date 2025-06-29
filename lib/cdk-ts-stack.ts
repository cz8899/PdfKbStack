import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export class CdkTsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const lambdaRoleArn = this.node.tryGetContext('LambdaExecutionRoleArn');
    const embeddingModelArn = this.node.tryGetContext('EmbeddingModelArn');
    const collectionArn = this.node.tryGetContext('OpenSearchCollectionArn');

    // S3 Bucket
    const bucket = new s3.Bucket(this, 'PdfIngestionBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    // Lambda Function
    const ingestionFunction = new lambda.Function(this, 'PdfIngestionFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      environment: {
        BUCKET_NAME: bucket.bucketName
      },
      role: iam.Role.fromRoleArn(this, 'LambdaExecRole', lambdaRoleArn)
    });

    // Grant bucket read access to Lambda
    bucket.grantRead(ingestionFunction);

    // S3 trigger
    bucket.addEventNotification(s3.EventType.OBJECT_CREATED_PUT, new s3n.LambdaDestination(ingestionFunction));

    // Bedrock Knowledge Base
    const knowledgeBase = new bedrock.CfnKnowledgeBase(this, 'MyKnowledgeBase', {
      name: 'MyKnowledgeBase',
      roleArn: lambdaRoleArn,
      knowledgeBaseConfiguration: {
        type: 'VECTOR',
        vectorKnowledgeBaseConfiguration: {
          embeddingModelArn: embeddingModelArn,
        }
      },
      // AWS CDK currently lacks OpenSearchServerlessConfiguration in its Bedrock types.
      // Manually override below to inject OpenSearch configuration.
      storageConfiguration: {
        type: 'OPENSEARCH_SERVERLESS'
      } as any // bypass strict typing
    });

    // Override OpenSearch config
    knowledgeBase.addPropertyOverride('StorageConfiguration.OpenSearchServerlessConfiguration', {
      collectionArn: collectionArn,
      vectorIndexName: 'my-vector-index',
      fieldMapping: {
        vectorField: 'vector',
        textField: 'text',
        metadataField: 'metadata'
      }
    });

    // Outputs
    new cdk.CfnOutput(this, 'BucketNameOutput', {
      value: bucket.bucketName
    });
  }
}
