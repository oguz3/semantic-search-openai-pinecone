import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const MODEL = "text-embedding-ada-002";

export async function createEmbedding(text: string) {
  const embedding = await openai.createEmbedding({
    model: MODEL,
    input: text,
  });

  return embedding.data;
}

export const generateAnswerFromOpenAI = async (
  prompt: string,
  content: string
) => {
  // Generate answer from OpenAI
  const apiResponse = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: `
    I want you to act as a document that I am having a conversation with. 
    Your name is "AI Assistant". 
    You will provide me with answers from the given info. 
    If the answer is not included, say exactly "Hmm, I am not sure." and stop after that. 
    Refuse to answer any question not about the info. 
    Never break character.
    I will give you the answer based on the following help article:
    ${content}

    Question: ${prompt}
    Answer:
  `,
    max_tokens: 2022,
    temperature: 0,
    top_p: 0,
    frequency_penalty: 0,
    presence_penalty: 0,
  });

  console.log(apiResponse?.data?.choices);
  return apiResponse?.data?.choices[0]?.text;
};
