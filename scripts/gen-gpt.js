"use strict";

async function promptGPT() {
	try {
        // Generate your own key and store it in `api_key.txt` file at the root directory
        const keyResponse = await fetch(`api_key.txt`);
        const apiKey = await keyResponse.text();
        const endpoint = 'https://api.openai.com/v1/chat/completions';
        const headers = {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${apiKey}`
		};

		const body = JSON.stringify({
			'model': 'gpt-3.5-turbo',
			'messages': [
				{
					'role': 'system',
					'content': 'You are a poetic assistant, skilled in explaining complex programming concepts with creative flair.'
				},
				{
					'role': 'user',
					'content': 'Compose a poem that explains the concept of recursion in programming.'
				}
			]
		});

		const apiResponse = await fetch(endpoint, {
			'method': 'POST',
			'headers': headers,
			'body': body
		});

		const data = await apiResponse.json()

		console.log(data.choices[0].message.content);
        
    } catch (error) {
        console.error('Error fetching the text file:', error);
    }
}