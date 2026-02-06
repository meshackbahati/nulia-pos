import models, { sequelize } from '../models/index.js';

async function verifyFixes() {
    console.log('🔍 Starting verification of database and model fixes...');
    let errors = 0;

    // 1. Verify models.Sequelize and models.Op
    console.log('\n--- Model Structure Check ---');
    if (models.Sequelize) {
        console.log('✅ models.Sequelize is defined');
    } else {
        console.error('❌ models.Sequelize is UNDEFINED');
        errors++;
    }

    if (models.Op && models.Op.or) {
        console.log('✅ models.Op is defined and functional');
    } else {
        console.error('❌ models.Op is UNDEFINED or broken');
        errors++;
    }

    // 2. Verify SQL Alias Quoting (Regex check on the file since we can't easily mock the DB call without a real DB and data)
    console.log('\n--- SQL Query Syntax Check ---');
    try {
        const fs = await import('fs');
        const path = await import('path');
        const url = await import('url');
        const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
        const analyticsPath = path.join(__dirname, '../routes/analytics.js');
        const content = fs.readFileSync(analyticsPath, 'utf8');

        const patterns = [
            { name: 'totalSpent quoted', regex: /"totalSpent"/ },
            { name: 'totalQty quoted', regex: /"totalQty"/ },
            { name: 'quantity quoted', regex: /"quantity"/ }
        ];

        patterns.forEach(p => {
            if (p.regex.test(content)) {
                console.log(`✅ Pattern found: ${p.name}`);
            } else {
                console.error(`❌ Pattern NOT found: ${p.name}`);
                errors++;
            }
        });
    } catch (err) {
        console.error('❌ Failed to read analytics.js for syntax check:', err.message);
        errors++;
    }

    // 3. Database Connectivity
    console.log('\n--- Database Connection Check ---');
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection successful');
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
        errors++;
    }

    console.log('\n--- Result Summary ---');
    if (errors === 0) {
        console.log('🎉 Verification PASSED! All checked items are correct.');
        process.exit(0);
    } else {
        console.log(`⚠️ Verification FAILED with ${errors} error(s).`);
        process.exit(1);
    }
}

verifyFixes().catch(err => {
    console.error('💥 Fatal error during verification:', err);
    process.exit(1);
});
