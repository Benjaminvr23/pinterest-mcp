import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

const PINTEREST_TOKEN = process.env.PINTEREST_TOKEN;

app.post('/mcp', async (req, res) => {
  const { method, params, id } = req.body || {};

  // 1. Verificación e inicialización de Claude
  if (method === 'initialize') {
    return res.json({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'pinterest-mcp', version: '1.0.0' }
      }
    });
  }

  if (method === 'notifications/initialized') {
    return res.status(200).end();
  }

  // 2. Listar herramientas
  if (method === 'tools/list') {
    return res.json({
      jsonrpc: '2.0',
      id,
      result: {
        tools: [
          {
            name: 'obtener_tableros',
            description: 'Obtiene la lista de tableros de Pinterest del usuario.',
            inputSchema: { type: 'object', properties: {} }
          },
          {
            name: 'obtener_pines',
            description: 'Obtiene los pines de un tablero específico.',
            inputSchema: {
              type: 'object',
              properties: {
                board_id: { type: 'string', description: 'ID del tablero' }
              },
              required: ['board_id']
            }
          }
        ]
      }
    });
  }

  // 3. Ejecutar herramientas
  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};

    if (name === 'obtener_tableros') {
      const response = await fetch('https://api.pinterest.com/v5/boards', {
        headers: { 'Authorization': `Bearer ${PINTEREST_TOKEN}` }
      });
      const data = await response.json();
      return res.json({
        jsonrpc: '2.0',
        id,
        result: { content: [{ type: 'text', text: JSON.stringify(data.items || []) }] }
      });
    }

    if (name === 'obtener_pines') {
      const response = await fetch(`https://api.pinterest.com/v5/boards/${args.board_id}/pins`, {
        headers: { 'Authorization': `Bearer ${PINTEREST_TOKEN}` }
      });
      const data = await response.json();
      return res.json({
        jsonrpc: '2.0',
        id,
        result: { content: [{ type: 'text', text: JSON.stringify(data.items || []) }] }
      });
    }
  }

  res.status(400).json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Método no encontrado' } });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor MCP escuchando en puerto ${PORT}`));
