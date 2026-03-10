const { ipcMain } = require('electron')
const { Groq } = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function categorizeTransactions(_, transactions) {
    const chatCompletion = await groq.chat.completions.create({
        "messages": [
            {
                "role": "system",
                "content": `Você é um assistente especializado em categorias transações financeiras. 
                Sua tarefa é analisar os detalhes de cada transação e sugerir a categoria mais 
                apropriada com base nas informações fornecidas. 
                Considere o nome do estabelecimento, a descrição da transação, o valor e a data para determinar 
                a categoria correta. As categorias podem incluir, mas não estão limitadas a: 
                Alimentação, Transporte, Salario, Transferência, Cartão de Credito, Telefone, Internet, Lazer, Saúde, Educação, Moradia, Compras, Serviços e Outras. 
                Forneça apenas a categoria sugerida para cada transação sem explicações adicionais. 
                A resposta DEVE ser um array de categorias correspondentes à ordem das transações fornecidas`
            },
            {
                "role": "user",
                "content": `Categorize as transações abaixo:
                    ${JSON.stringify(transactions, null, 2)}
                `
            }
        ],
        "model": "openai/gpt-oss-120b",
        "temperature": 0
    });

    const result = chatCompletion.choices[0].message.content
    const jsonStr = result.substring(result.indexOf('["'), result.lastIndexOf('"]') + 2)

    return JSON.parse(jsonStr)
}

function registerLlmHandlers() {
    ipcMain.handle('ai:categorize', categorizeTransactions)
}

module.exports = { registerLlmHandlers }