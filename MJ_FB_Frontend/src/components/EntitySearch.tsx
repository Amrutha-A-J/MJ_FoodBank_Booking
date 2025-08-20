import { useEffect, useState, type ReactNode } from 'react';
import { TextField, Button } from '@mui/material';
import { searchUsers } from '../api/users';
import { searchVolunteers } from '../api/volunteers';

interface EntitySearchProps {
  token: string;
  type: 'user' | 'volunteer';
  placeholder?: string;
  onSelect: (result: any) => void;
  renderResult?: (result: any, select: () => void) => ReactNode;
}

export default function EntitySearch({
  token,
  type,
  placeholder,
  onSelect,
  renderResult,
}: EntitySearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      return;
    }
    let active = true;
    const fn = type === 'user' ? searchUsers : searchVolunteers;
    fn(token, query)
      .then(data => {
        if (active) setResults(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [query, token, type]);

  const getLabel = (r: any) =>
    type === 'user' ? `${r.name} (${r.client_id})` : r.name;

  function handleSelect(res: any) {
    setQuery(getLabel(res));
    setResults([]);
    onSelect(res);
  }

  return (
    <div>
      <TextField
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={placeholder}
        label="Search"
        size="small"
        fullWidth
        sx={{ mb: 1 }}
      />
      {results.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {results.map(r => (
            <li key={r.id}>
              {renderResult ? (
                renderResult(r, () => handleSelect(r))
              ) : (
                <Button
                  onClick={() => handleSelect(r)}
                  variant="outlined"
                  color="primary"
                >
                  {getLabel(r)}
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        query.length >= 3 && <p>No search results.</p>
      )}
    </div>
  );
}

