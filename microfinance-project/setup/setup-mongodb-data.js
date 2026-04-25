// MongoDB setup script for microfinance project
// Run this with: mongosh microfinance_db setup-mongodb-data.js

// Switch to the microfinance_db database
use('microfinance_db');

print("🔧 Setting up sample data for microfinance project...");

// Clear existing sample data (optional - remove if you want to keep existing data)
try {
    db.sample_applicants.deleteMany({});
    print("✓ Cleared existing sample_applicants data");
} catch (e) {
    print("⚠️ No existing sample_applicants data to clear");
}

// Insert sample applicants with predefined credit scores
const sampleApplicants = [
    {
        nic: "199123456789",
        creditScore: 750,
        fullName: "John Sample High Score",
        riskLevel: "Low"
    },
    {
        nic: "199234567890",
        creditScore: 650,
        fullName: "Jane Sample Medium Score",
        riskLevel: "Medium"
    },
    {
        nic: "199345678901",
        creditScore: 550,
        fullName: "Bob Sample Low Score",
        riskLevel: "High"
    },
    {
        nic: "199456789012",
        creditScore: 800,
        fullName: "Alice Sample Excellent Score",
        riskLevel: "Low"
    },
    {
        nic: "200189012345",
        creditScore: 720,
        fullName: "Mike Sample Good Score",
        riskLevel: "Low"
    },
    {
        nic: "200298765432",
        creditScore: 580,
        fullName: "Sarah Sample Fair Score",
        riskLevel: "High"
    }
];

try {
    const result = db.sample_applicants.insertMany(sampleApplicants);
    print(`✅ Successfully inserted ${result.insertedIds.length} sample applicants`);
} catch (e) {
    print(`❌ Error inserting sample data: ${e}`);
}

// Verify the data was inserted
const count = db.sample_applicants.countDocuments();
print(`📊 Total sample applicants in database: ${count}`);

// Display all sample data
print("\n📋 Sample Applicants Data:");
print("NIC               | Credit Score | Full Name                    | Risk Level");
print("------------------|--------------|------------------------------|----------");

db.sample_applicants.find().forEach(function(doc) {
    const nic = doc.nic.padEnd(17, ' ');
    const score = doc.creditScore.toString().padEnd(12, ' ');
    const name = doc.fullName.padEnd(28, ' ');
    print(`${nic} | ${score} | ${name} | ${doc.riskLevel}`);
});

print("\n🎯 Test Cases Ready:");
print("✓ NICs in sample_applicants (fixed scores): 199123456789, 199234567890, 199345678901, 199456789012, 200189012345, 200298765432");
print("✓ Test with any other NIC for calculated scores");

print("\n🔍 To verify data manually:");
print("  db.sample_applicants.find().pretty()");
print("  db.sample_applicants.findOne({nic: '199123456789'})");

print("\n✅ MongoDB setup complete!");