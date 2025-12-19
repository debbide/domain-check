
const fetch = require('node-fetch');

async function testWhois() {
    const domain = 'google.com';
    const whoisUrl = `https://ip.sb/whois/${encodeURIComponent(domain)}`;
    console.log(`Testing WHOIS for ${domain} via ${whoisUrl}...`);

    try {
        const response = await fetch(whoisUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });

        if (!response.ok) {
            console.error(`Status: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error('Body:', text.substring(0, 200)); // Print first 200 chars
            return;
        }

        const text = await response.text();
        console.log('Success! Length:', text.length);
        // console.log(text.substring(0, 500));
    } catch (error) {
        console.error('Fetch Failed:', error);
    }
}

testWhois();
