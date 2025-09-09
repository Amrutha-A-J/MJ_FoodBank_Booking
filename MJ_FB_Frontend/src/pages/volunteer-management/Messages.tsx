import { useEffect, useState } from 'react';
import { Button, List, ListItem, ListItemText, Stack, TextField, Typography } from '@mui/material';
import Page from '../../components/Page';
import VolunteerBottomNav from '../../components/VolunteerBottomNav';
import { getMessages, sendMessage, type Message } from '../../api/messages';
import dayjs from '../../utils/date';

export default function Messages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    getMessages().then(setMessages).catch(() => {});
  }, []);

  async function submit() {
    if (!text.trim()) return;
    try {
      const msg = await sendMessage(text);
      setMessages(m => [...m, msg]);
      setText('');
    } catch {
      /* ignore errors */
    }
  }

  return (
    <Page title="Messages">
      <Stack spacing={2} sx={{ pb: 8 }}>
        <List>
          {messages.map(m => (
            <ListItem key={m.id} sx={{ pl: 0 }}>
              <ListItemText
                primary={m.sender_role === 'volunteer' ? 'You' : 'Coordinator'}
                secondary={`${m.body} — ${dayjs(m.created_at).format('MMM D, h:mm A')}`}
              />
            </ListItem>
          ))}
          {messages.length === 0 && <Typography>No messages</Typography>}
        </List>
        <Stack direction="row" spacing={1} sx={{ position: 'fixed', bottom: 56, left: 16, right: 16 }}>
          <TextField
            size="medium"
            label="Message"
            fullWidth
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <Button size="medium" variant="contained" onClick={submit} disabled={!text.trim()}>Send</Button>
        </Stack>
      </Stack>
      <VolunteerBottomNav />
    </Page>
  );
}
