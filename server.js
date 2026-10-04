const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// ==========================================
// ⚙️ CONFIGURACIÓN DEL MENSAJE AUTOMÁTICO
// ==========================================
const MENSAJE_RESPUESTA_AUTOMATICA = "¡Hola! Hemos recibido tu comprobante de pago correctamente. Tu código de acceso para este mes es: *ABRIL-2026-XYZ*. ¡Gracias!";

// Variables de entorno de Meta (se configuran en Render)
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'mi_clave_secreta_123';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || 'EAAO5MYi1Qf0BSj8VbrYYb1mhxDZCy64dnothU2Jj19xHfYSIvfeclFhoOqh3Pek1Te6jnWGDMBwnHxNVpnjYCvpqSAXJUsZCnxZB1DZCb1sAAUisaaSx4FTz6N9ayYcQXvTw7QuOQ9iBPvffHilIZBGCVKACEvOlSKzAcK7bgSQfu70HTJWGeeaqjF5FoZCZAiPUyIzaTc56zKBlzDTAeVGGiqOxuZBy0wEOMbEGMHKqlricjSoyRme07cKMn8Fo9IsUy2X0re3qN1WZAArSbBBPP';
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || '1317182764817421';
const PORT = process.env.PORT || 3000;

// Ruta de verificación para Meta
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED: Webhook verificado correctamente.');
            res.status(200).send(challenge);
        } else {
            console.error('VERIFICATION_FAILED: Los tokens no coinciden.');
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
});

// Ruta principal para recibir los mensajes y comprobantes de los clientes
app.post('/webhook', async (req, res) => {
    // Respondemos inmediatamente a Meta con 200 OK para evitar timeouts
    res.sendStatus(200);

    try {
        const body = req.body;

        if (body.object === 'whatsapp_business_account') {
            for (const entry of body.entry) {
                for (const change of entry.changes) {
                    const value = change.value;
                    if (value && value.messages && value.messages.length > 0) {
                        const message = value.messages[0];
                        const senderID = message.from; // Número de teléfono del cliente
                        const messageType = message.type; // Tipo de mensaje (text, image, etc.)

                        console.log(`Mensaje recibido de ${senderID}. Tipo de archivo: ${messageType}`);

                        // Si el cliente envía una imagen (captura del comprobante)
                        if (messageType === 'image') {
                            console.log(`¡Comprobante en imagen detectado! Enviando respuesta automática...`);
                            await sendWhatsAppMessage(senderID, MENSAJE_RESPUESTA_AUTOMATICA);
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error procesando el webhook:', error.message);
    }
});

// Función para enviar mensajes automáticos por WhatsApp Cloud API
async function sendWhatsAppMessage(recipientID, textMessage) {
    // Actualizado a v25.0 que es la versión actual y compatible con la plataforma
    const url = `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`;

    const data = {
        messaging_product: 'whatsapp',
        to: recipientID,
        type: 'text',
        text: { body: textMessage }
    };

    const headers = {
        authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'content-type': 'application/json'
    };

    try {
        const response = await axios.post(url, data, { headers });
        console.log(`Respuesta automática enviada con éxito a ${recipientID}:`, response.data);
    } catch (error) {
        console.error('Error al enviar el mensaje de WhatsApp:', error.response?.data || JSON.stringify(error.response?.data) || error.message);
    }
}

app.listen(PORT, () => {
    console.log(`Servidor de bot corriendo en el puerto ${PORT}`);
});
