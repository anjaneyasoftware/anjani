const express = require('express');
const router = express.Router();
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

router.get('/generate-token', (req, res) => {
  const userId = req.query.userId;
  const channel = req.query.channel;

  if (!APP_ID || !APP_CERTIFICATE) {
    return res.status(500).json({ error: 'Agora credentials are not configured.' });
  }

  if (!userId || !channel) {
    return res.status(400).json({ error: 'userId and channel are required' });
  }

  const uid = 0; // or parseInt(userId, 10) if needed
  const role = RtcRole.PUBLISHER;
  const expirationTimeInSeconds = 18000;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpireTime = currentTimestamp + expirationTimeInSeconds;

  const token = RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channel,
    uid,
    role,
    privilegeExpireTime
  );

  res.json({ token });
});

module.exports = router;
