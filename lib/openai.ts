import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY || '';

export default apiKey ? new OpenAI({ apiKey }) : null;

