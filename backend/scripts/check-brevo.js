
import models, { sequelize } from './models/index.js';

async function checkBrevoSettings() {
  try {
    const apiKeySetting = await models.Setting.findOne({ where: { category: 'brevo', key: 'apiKey' } });
    const senderEmailSetting = await models.Setting.findOne({ where: { category: 'brevo', key: 'senderEmail' } });

    console.log('Brevo API Key Setting found:', !!apiKeySetting);
    if (apiKeySetting) {
      console.log('Is Encrypted:', apiKeySetting.isEncrypted);
      const decryptedValue = apiKeySetting.getDecryptedValue();
      console.log('Decrypted API Key length:', decryptedValue ? decryptedValue.length : 0);
      console.log('Decrypted API Key (first 4):', decryptedValue ? decryptedValue.substring(0, 4) : 'null');
    }

    console.log('Brevo Sender Email Setting found:', !!senderEmailSetting);
    if (senderEmailSetting) {
      console.log('Sender Email:', senderEmailSetting.value);
    }

    console.log('--- Environment Variables ---');
    console.log('BREVO_SENDER_EMAIL:', process.env.BREVO_SENDER_EMAIL);
    console.log('***REMOVED*** exists:', !!process.env.***REMOVED***);
    if (process.env.***REMOVED***) {
        console.log('***REMOVED*** length:', process.env.***REMOVED***.length);
        console.log('***REMOVED*** (first 4):', process.env.***REMOVED***.substring(0, 4));
    }

  } catch (error) {
    console.error('Error checking Brevo settings:', error);
  } finally {
    await sequelize.close();
  }
}

checkBrevoSettings();
