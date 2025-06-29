const AWS = require('aws-sdk');
const S3 = new AWS.S3();
const pdfParse = require('pdf-parse');

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  // Process all records (usually one per event)
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    console.log(`New PDF uploaded to bucket: ${bucket}, key: ${key}`);

    try {
      // Get the PDF file from S3
      const s3Object = await S3.getObject({ Bucket: bucket, Key: key }).promise();

      // Parse PDF buffer
      const pdfData = await pdfParse(s3Object.Body);

      // Extracted text content
      const textContent = pdfData.text;

      console.log(`Extracted text from PDF:\n${textContent}`);

      // TODO: Add logic to send the extracted text to Bedrock or OpenSearch here
      
    } catch (error) {
      console.error(`Error processing file ${key} from bucket ${bucket}:`, error);
      throw error;
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "PDF processed successfully" }),
  };
};
