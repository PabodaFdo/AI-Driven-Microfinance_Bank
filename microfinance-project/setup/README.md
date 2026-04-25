# Setup Files

This directory contains utility files for setting up and testing the microfinance project.

## Files:

### `sample_applicants_data.json`
- Sample test data with predefined credit scores
- Contains 6 sample applicants with different risk levels
- Useful for testing the credit scoring and risk assessment features

### `setup-mongodb-data.js`
- MongoDB setup script for initializing sample data
- Usage: `mongosh microfinance_db setup-mongodb-data.js`
- Creates sample applicants in the database for testing

## Usage:
1. Use the MongoDB setup script to populate your database with test data
2. Use the JSON file as reference for sample data structure