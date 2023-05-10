import { ulid } from "ulid";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { z } from "zod";
import { prisma } from "../../../server/db/client";
import {
  createEmbedding,
  generateAnswerFromOpenAI,
} from "../../../utils/openai";
import { protectedProcedure, router } from "../trpc";
import { makeChain } from "../../../utils/makechain";
import {
  PINECONE_INDEX_NAME,
  PINECONE_NAME_SPACE,
} from "../../../config/pinecone";
import { pinecone } from "../../../utils/pinecone-client";
import { QueryRequest } from "@pinecone-database/pinecone";
import { Document } from "langchain/document";

export const openAiPinecone = router({
  upsertEmbedding: protectedProcedure
    .input(z.object({ text: z.string(), title: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { text, title } = input;
      const id = ulid();

      /* Split text into chunks */
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      const docs = await textSplitter.splitText(text);
      /*create and store the embeddings in the vectorStore*/
      const embeddings = new OpenAIEmbeddings();
      const index = pinecone.Index(PINECONE_INDEX_NAME); //change to your own index name

      const documents = docs.map(
        (doc) =>
          new Document({
            pageContent: doc,
            metadata: { userId: ctx.session.user.id, text: doc, title },
          })
      );

      //embed the PDF documents
      await PineconeStore.fromDocuments(documents, embeddings, {
        pineconeIndex: index,
        namespace: PINECONE_NAME_SPACE,
        textKey: "text",
      });

      for (const document of documents) {
        await prisma.library.create({
          data: {
            title,
            description: document.pageContent,
            embeddingId: id,
            userId: ctx.session.user.id,
          },
        });
      }

      return {
        test: input.text,
        user: ctx.session.user.email,
      };
    }),
  searchEmbedding: protectedProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const text = input.text;
      const sanitizedQuestion = text.trim().replaceAll("\n", " ");

      try {
        const index = pinecone.Index(PINECONE_INDEX_NAME);

        /* create vectorstore*/
        const vectorStore = await PineconeStore.fromExistingIndex(
          new OpenAIEmbeddings({}),
          {
            pineconeIndex: index,
            namespace: PINECONE_NAME_SPACE,
            filter: {
              userId: ctx.session.user.id,
            },
          }
        );

        //create chain
        const chain = makeChain(vectorStore);
        //Ask a question using chat history
        const response = await chain.call({
          question: sanitizedQuestion,
          chat_history: [],
        });

        return {
          question: input.text,
          user: ctx.session.user.email,
          contents: [],
          answer: response.text,
        };
      } catch (error) {
        console.log("error", error);
      }
      return {
        question: input.text,
        user: ctx.session.user.email,
        contents: [],
        answer: "Hmm",
      };
    }),
});
