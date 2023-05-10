import { OpenAI } from "langchain/llms/openai";
import type { PineconeStore } from "langchain/vectorstores/pinecone";
import { ConversationalRetrievalQAChain } from "langchain/chains";

const CONDENSE_PROMPT = `
Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.
Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:`;

const QA_PROMPT = `    
I want you to act as a document that I am having a conversation with. 
Your name is "AI Assistant". 
You will provide me with answers from the given info. 
If the answer is not included, say exactly "Hmm, I am not sure." and stop after that. 
Refuse to answer any question not about the info. 
Never break character.
I will give you the answer based on the following help article:
{context}

Question: {question}
Helpful answer:`;

export const makeChain = (vectorStore: PineconeStore) => {
  const model = new OpenAI({
    temperature: 0, // increase temepreature to get more creative answers
    modelName: "gpt-3.5-turbo", //change this to gpt-4 if you have access
  });

  const chain = ConversationalRetrievalQAChain.fromLLM(
    model,
    vectorStore.asRetriever(),
    {
      qaTemplate: QA_PROMPT,
      questionGeneratorTemplate: CONDENSE_PROMPT,
      returnSourceDocuments: true, //The number of source documents returned is 4 by default
    }
  );
  return chain;
};
