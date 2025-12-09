require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const FLOWISE_URL = process.env.FLOWISE_URL;

// Health check
app.get('/', (req, res) => {
  res.send('WhatsApp + Flowise bot online');
});

// Webhook para receber mensagem do provedor de WhatsApp
app.post('/webhook', async (req, res) => {
  console.log('Webhook recebido:', JSON.stringify(req.body, null, 2));

  try {
    const incoming = extractMessage(req.body);

    if (!incoming.text) {
      return res.status(200).json({ reply: 'Nenhuma mensagem de texto recebida.' });
    }

    if (!FLOWISE_URL) {
      console.error('FLOWISE_URL não configurada');
      return res.status(500).json({ error: 'FLOWISE_URL não configurada no servidor.' });
    }

    // Chamada ao Flowise
    const flowiseResponse = await axios.post(FLOWISE_URL, {
      question: incoming.text,
      overrides: {
        sessionId: incoming.from || 'anon'
      }
    });

    const data = flowiseResponse.data || {};
    const answer =
      data.text ||
      data.answer ||
      data.response ||
      JSON.stringify(data);

    // Resposta genérica (depois adaptamos para o formato do seu provedor de WhatsApp)
    return res.status(200).json({
      to: incoming.from,
      reply: answer
    });
  } catch (error) {
    console.error('Erro ao processar mensagem:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Erro interno ao processar mensagem.' });
  }
});

// Função genérica para tentar extrair texto e número
function extractMessage(body) {
  let text =
    body?.message ||
    body?.text ||
    null;

  let from =
    body?.from ||
    body?.sender ||
    body?.phone ||
    null;

  if (Array.isArray(body?.messages) && body.messages[0]) {
    const msg = body.messages[0];
    text =
      text ||
      msg.text?.body ||
      msg.body ||
      null;

    from = from || msg.from || null;
  }

  return { text, from };
}

app.listen(PORT, () => {
  console.log(`Servidor em execução na porta ${PORT}`);
});
