#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { AwsDynamoDbSampleStack } from '../lib/aws-dynamo_db-sample-stack';

const app = new cdk.App();
new AwsDynamoDbSampleStack(app, 'AwsDynamoDbSampleStack');
