#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkTsStack } from '../lib/cdk-ts-stack';

const app = new cdk.App();
new CdkTsStack(app, 'PdfTsStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  }
});
