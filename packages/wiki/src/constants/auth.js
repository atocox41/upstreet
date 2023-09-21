export const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
export const OPENAI_ACCESS_TOKEN = import.meta.env.VITE_OPENAI_ACCESS_TOKEN;

export const AWS_ACCESS_KEY = import.meta.env.VITE_AWS_ACCESS_KEY;
export const AWS_SECRET_ACCESS_KEY = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY;

// if (!OPENAI_API_KEY || !OPENAI_ACCESS_TOKEN) {
//   throw new Error('frontend missing OPENAI_API_KEY or OPENAI_ACCESS_TOKEN');
// }