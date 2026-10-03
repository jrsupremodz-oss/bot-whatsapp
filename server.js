const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// ==========================================
// ⚙️ CONFIGURACIÓN DEL MENSAJE AUTOMÁTICO (CAMBIA ESTO CADA MES)
// ==========================================
// Aquí escribes el texto que quieres que el bot le mande automáticamente al cliente 
// en cuanto suba su foto de comprobante. Puedes incluir tu código, enlace, etc.
const MENSAJE_RESPUESTA_AUTOMATICA = "¡Hola! Hemos recibido tu comprobante de pago correctamente. Tu código de acceso para este mes es: *ABRIL-2026-XYZ*. ¡Gracias!";

// Variables de entorno de Meta (se configuran en Render)
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'mi_token_secreto_de_verificacion';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || 'tu_token_de_acceso_de_meta';
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || 'tu_id_de_numero_de_whatsapp';
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
            res.status(200).send('EVENT_RECEIVED');
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error('Error procesando el webhook:', error.message);
        res.sendStatus(500);
    }
});

// Función para enviar mensajes automáticos por WhatsApp Cloud API
async function sendWhatsAppMessage(recipientID, textMessage) {
    const url = `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`;

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
        console.error('Error al enviar el mensaje de WhatsApp:', error.response?.data || error.message);
    }
}

app.listen(PORT, () => {
    console.log(`Servidor de bot corriendo en el puerto ${PORT}`);
});
