const crypto = require('crypto');
require('dotenv').config();

const generateXVerifyHeader = (data, saltKey, saltIndex) => {
    const sha256 = crypto.createHash('sha256').update(data + saltKey).digest('hex');
    return sha256 + "###" + saltIndex;
};

module.exports = { generateXVerifyHeader };
