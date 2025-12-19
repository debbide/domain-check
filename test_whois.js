
const { fetchDomainFromAPI } = require('./server/whois');

async function testWhois() {
    console.log('Testing WHOIS for google.com...');
    try {
        const data = await fetchDomainFromAPI('google.com');
        console.log('WHOIS Result:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('WHOIS Test Failed:', error);
    }
}

testWhois();
