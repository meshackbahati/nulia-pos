import sequelize from '../lib/database.js';
import models from '../models/index.js';

async function updateBranchCallbacks() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const branches = await models.Branch.findAll();
        console.log(`Found ${branches.length} branches.`);

        for (const branch of branches) {
            const oldUrl = branch.mpesaCallbackUrl;
            branch.mpesaCallbackUrl = branch.generateCallbackUrl();
            await branch.save();
            console.log(`Updated branch ${branch.name}: ${oldUrl} -> ${branch.mpesaCallbackUrl}`);
        }

        console.log('Finished updating branch callback URLs.');
        process.exit(0);
    } catch (error) {
        console.error('Update failed:', error);
        process.exit(1);
    }
}

updateBranchCallbacks();
