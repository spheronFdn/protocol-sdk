import cors from 'cors';
import express, { Express, Request, Response } from 'express';
import http from 'http';
import { Agent } from 'https';
import fetch, { Headers } from 'node-fetch';
import WebSocket, { WebSocketServer } from 'ws';

const app: Express = express();

const { PORT = 3040 } = process.env;

app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.status(200).send('OK');
});

app.post('/', async (req: Request, res: Response, next: (arg0: unknown) => void) => {
  const { authToken, method, body, url } = req.body;

  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  headers.append('Auth-Spheron', authToken);

  try {
    const httpsAgent = new Agent({
      rejectUnauthorized: false,
    });

    const response = await fetch(url, {
      method: method,
      body: body,
      headers: headers,
      agent: httpsAgent,
    });

    if (response.status === 200) {
      const responseText = await response.text();
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.indexOf('application/json') !== -1) {
        res.contentType('application/json');
      } else {
        res.contentType('application/text');
      }
      res.send(responseText);
    } else {
      const _res = await response.text();
      console.log(`Status code was not success (${response.status}) : ${_res}`);

      res.status(500);
      res.send(_res);
    }
  } catch (error) {
    next(error);
  }
});

app.post('/ws-data', async (req, res) => {

  const { authToken, url } = req.body;

  if (!authToken) {
    return res.status(400).json({ error: 'authToken is required' });
  }

  try {
    const data = await getDataFromWebSocket(authToken, url);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

function getDataFromWebSocket(authToken: string, url: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const wsUrl = `${url.replace("https://", "wss://")}`;
    const wsHeaders = {
      'Auth-Spheron': authToken,
    };

    const httpsAgent = new Agent({
      rejectUnauthorized: false,
    });

    const ws = new WebSocket(wsUrl, {
      headers: wsHeaders,
      agent: httpsAgent,
    });

    const logMessages: string[] = [];

    ws.on('open', () => {
      console.log('WebSocket connection opened');
    });

    ws.on('message', (data) => {
      console.log("data -> ", data);
      logMessages.push(data.toString());
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
      resolve(logMessages);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      reject(error);
    });

    setTimeout(() => {
      ws.close();
    }, 50000);
  });
}

const httpServer = app.listen(PORT, () => {
  console.log(`Http server listening on port ${PORT}`);
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Object to store open WebSocket connections
const providerOpenSockets: Record<string, { socket: WebSocket; lastActivity: number }> = {};

wss.on('connection', (clientWs) => {
  console.log('WebSocket client connected');
  let wsKey: string;

  clientWs.on('message', async (message) => {
    try {
      const { authToken, hostUri, leaseId, service, command } = JSON.parse(message.toString());

      if (!authToken || !hostUri || !leaseId || !service || !command) {
        clientWs.send(JSON.stringify({ error: 'Missing required fields' }));
        return;
      }

      const url = `wss://${hostUri}/lease/${leaseId}/1/1/shell?stdin=1&tty=1&podIndex=0&cmd0=%2Fbin%2Fsh&service=${service}`;
      wsKey = `${leaseId}_${service}`;

      const handleOnMessage = (message: WebSocket.RawData) => {
        try {
          console.log("Message from provider: ", message);
          clientWs.send(JSON.stringify(message));
        } catch (error) {
          console.error('Error handling message:', error);
          clientWs.send(JSON.stringify({ error: 'Failed to handle message' }));
        }
      };

      if (providerOpenSockets[wsKey]) {
        const openWs = providerOpenSockets[wsKey].socket;
        providerOpenSockets[wsKey].lastActivity = Date.now();
        openWs.removeAllListeners('message');
        openWs.on('message', handleOnMessage);
        console.log('Command:', command);
        const data = Buffer.from(command.split(","));
        if (openWs.readyState === WebSocket.OPEN) {
          console.log('Reusing open providerWs');
          openWs.send(data);
        } else {
          console.log('providerWs is not open, creating a new connection');
          providerOpenSockets[wsKey].socket.terminate();
          delete providerOpenSockets[wsKey];
          openWs.send(JSON.stringify({ error: 'Provider WebSocket was closed, retrying connection' }));
        }
      } else {
        // Create a new WebSocket connection to Provider
        const httpsAgent = new Agent({
          rejectUnauthorized: false,
        });
        const providerWs = new WebSocket(url, {
          headers: {
            'Auth-Spheron': authToken,
          },
          agent: httpsAgent,
        });

        providerWs.on('open', () => {
          console.log('Provider WebSocket connection established');
          startKeepAlive(providerWs);
        });

        providerWs.on('message', handleOnMessage);

        providerWs.on('error', (err: any) => {
          console.error('Error with provider WebSocket connection:', err);
          clientWs.send(JSON.stringify({ error: 'Failed to connect to provider server' }));
        });

        providerWs.on('close', () => {
          console.log('Connection to provider WebSocket server closed');
          delete providerOpenSockets[wsKey]; // Remove the closed connection
        });

        providerOpenSockets[wsKey] = {
          socket: providerWs,
          lastActivity: Date.now(),
        };
      }
    } catch (error) {
      console.error('Error processing message:', error);
      clientWs.send(JSON.stringify({ error: 'Failed to process message' }));
    }
  });

  clientWs.on('close', (...data) => {
    console.log('WebSocket client disconnected', data);
    if (wsKey && providerOpenSockets[wsKey]) {
      console.log("Terminating Provider WebSocket");
      providerOpenSockets[wsKey].socket.terminate();
    }
  });
});

function startKeepAlive(ws: any) {
  const interval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(interval);
    }
  }, 30000);

  ws.on('close', () => clearInterval(interval));
}

// Start the HTTP server
// httpServer.listen(PORT, () => {
//   console.log(`HTTP server listening on port ${PORT}`);
// });

httpServer.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, socket => {
    wss.emit("connection", socket, request);
  });
});