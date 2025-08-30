import { useEffect, useState, type ReactNode } from 'react';
import { TextField, Button } from '@mui/material';
import { searchUsers } from '../api/users';
import { searchVolunteers } from '../api/volunteers';
import { searchAgencies } from '../api/agencies';

interface EntitySearchProps {
  type: 'user' | 'volunteer' | 'agency';
  placeholder?: string;
  onSelect: (result: any) => void;
  renderResult?: (result: any, select: () => void) => ReactNode;
  searchFn?: (query: string) => Promise<any[]>;
  clearOnSelect?: boolean;
}

export default function EntitySearch({
  type,
  placeholder,
  onSelect,
  renderResult,
  searchFn,
  clearOnSelect = false,
}: EntitySearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      return;
    }
    let active = true;
    const handler = setTimeout(() => {
      const fn =
        searchFn ||
        (type === 'user'
          ? searchUsers
          : type === 'volunteer'
          ? searchVolunteers
          : searchAgencies);
      fn(query)
        .then(data => {
          if (active) setResults(data);
        })
        .catch(() => {});
    }, 500);
    return () => {
      active = false;
      clearTimeout(handler);
    };
  }, [query, type, searchFn]);

  const getLabel = (r: any) => {
    if (type === 'user') return `${r.name} (${r.client_id})`;
    if (type === 'agency') return `${r.name} (${r.id})`;
    return r.name;
  };

  function handleSelect(res: any) {
    setQuery(clearOnSelect ? '' : getLabel(res));
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

