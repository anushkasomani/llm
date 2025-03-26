"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv = require("dotenv");
dotenv.config();
var cheerio_1 = require("@langchain/community/document_loaders/web/cheerio");
var text_splitter_1 = require("langchain/text_splitter");
var memory_1 = require("langchain/vectorstores/memory");
var prompts_1 = require("@langchain/core/prompts");
var history_aware_retriever_1 = require("langchain/chains/history_aware_retriever");
var combine_documents_1 = require("langchain/chains/combine_documents");
var retrieval_1 = require("langchain/chains/retrieval");
var messages_1 = require("@langchain/core/messages");
var langgraph_1 = require("@langchain/langgraph");
var uuid_1 = require("uuid");
var groq_1 = require("@langchain/groq");
var google_genai_1 = require("@langchain/google-genai");
var llm2 = new groq_1.ChatGroq({
    model: "llama-3.3-70b-versatile",
    temperature: 0
});
var loader2 = new cheerio_1.CheerioWebBaseLoader("https://lilianweng.github.io/posts/2023-06-23-agent/");
var docs2 = await loader2.load();
var textSplitter2 = new text_splitter_1.RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
});
var splits2 = await textSplitter2.splitDocuments(docs2);
var vectorStore2 = await memory_1.MemoryVectorStore.fromDocuments(splits2, new google_genai_1.GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
}));
// Retrieve and generate using the relevant snippets of the blog.
var retriever2 = vectorStore2.asRetriever();
var contextualizeQSystemPrompt2 = "Given a chat history and the latest user question " +
    "which might reference context in the chat history, " +
    "formulate a standalone question which can be understood " +
    "without the chat history. Do NOT answer the question, " +
    "just reformulate it if needed and otherwise return it as is.";
var contextualizeQPrompt2 = prompts_1.ChatPromptTemplate.fromMessages([
    ["system", contextualizeQSystemPrompt2],
    new prompts_1.MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
]);
var historyAwareRetriever2 = await (0, history_aware_retriever_1.createHistoryAwareRetriever)({
    llm: llm2,
    retriever: retriever2,
    rephrasePrompt: contextualizeQPrompt2,
});
var systemPrompt2 = "You are an assistant for question-answering tasks. " +
    "Use the following pieces of retrieved context to answer " +
    "the question. If you don't know the answer, say that you " +
    "don't know. Use three sentences maximum and keep the " +
    "answer concise." +
    "\n\n" +
    "{context}";
var qaPrompt2 = prompts_1.ChatPromptTemplate.fromMessages([
    ["system", systemPrompt2],
    new prompts_1.MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
]);
var questionAnswerChain2 = await (0, combine_documents_1.createStuffDocumentsChain)({
    llm: llm2,
    prompt: qaPrompt2,
});
var ragChain2 = await (0, retrieval_1.createRetrievalChain)({
    retriever: historyAwareRetriever2,
    combineDocsChain: questionAnswerChain2,
});
// Define the State interface
var GraphAnnotation2 = langgraph_1.Annotation.Root({
    input: (0, langgraph_1.Annotation)(),
    chat_history: (0, langgraph_1.Annotation)({
        reducer: langgraph_1.messagesStateReducer,
        default: function () { return []; },
    }),
    context: (0, langgraph_1.Annotation)(),
    answer: (0, langgraph_1.Annotation)(),
});
// Define the call_model function
function callModel2(state) {
    return __awaiter(this, void 0, void 0, function () {
        var response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ragChain2.invoke(state)];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/, {
                            chat_history: [
                                new messages_1.HumanMessage(state.input),
                                new messages_1.AIMessage(response.answer),
                            ],
                            context: response.context,
                            answer: response.answer,
                        }];
            }
        });
    });
}
// Create the workflow
var workflow2 = new langgraph_1.StateGraph(GraphAnnotation2)
    .addNode("model", callModel2)
    .addEdge(langgraph_1.START, "model")
    .addEdge("model", langgraph_1.END);
// Compile the graph with a checkpointer object
var memory2 = new langgraph_1.MemorySaver();
var app2 = workflow2.compile({ checkpointer: memory2 });
var threadId2 = (0, uuid_1.v4)();
var config2 = { configurable: { thread_id: threadId2 } };
var result3 = await app2.invoke({ input: "What is Task Decomposition?" }, config2);
console.log(result3.answer);
var result4 = await app2.invoke({ input: "What is one way of doing it?" }, config2);
console.log(result4.answer);
