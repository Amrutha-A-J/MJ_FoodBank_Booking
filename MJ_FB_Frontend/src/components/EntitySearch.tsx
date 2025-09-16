import { useEffect, useState, type ReactNode } from 'react';
import { TextField, Button, Typography } from '@mui/material';
import { searchUsers } from '../api/users';
import { searchVolunteers } from '../api/volunteers';
import FeedbackSnackbar from './FeedbackSnackbar';
interface SearchResultBase {
  id?: number | string;
  name: string;
  client_id?: number | string;
  hasPassword?: boolean;
  clientId?: number | string;
}

interface EntitySearchProps<T extends SearchResultBase> {
  type: 'user' | 'volunteer';
  placeholder?: string;
  onSelect: (result: T) => void;
  renderResult?: (result: T, select: () => void) => ReactNode;
  searchFn?: (query: string) => Promise<T[]>;
  clearOnSelect?: boolean;
  onNotFound?: (id: string) => void;
}

export default function EntitySearch<T extends SearchResultBase>({
  type,
  placeholder,
  onSelect,
  renderResult,
  searchFn,
  clearOnSelect = false,
  onNotFound,
}: EntitySearchProps<T>) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.length < 3) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    let active = true;
    const fn = searchFn || (type === 'user' ? searchUsers : searchVolunteers);
    setHasSearched(true);
    fn(debouncedQuery)
      .then(data => {
        if (active) setResults(data);
      })
      .catch(err => {
        console.error(err);
        if (active) setError('Failed to fetch search results');
      });
    return () => {
      active = false;
    };
  }, [debouncedQuery, type, searchFn]);

  const getLabel = (r: T) => {
    if (type === 'user') return `${r.name} (${r.client_id})`;
    return r.name;
  };

  function handleSelect(res: T) {
    setQuery(clearOnSelect ? '' : getLabel(res));
    setResults([]);
    setHasSearched(false);
    onSelect(res);
  }

  return (
    <div>
      <TextField
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          label="Search"
          inputProps={{
            'aria-label': placeholder || 'Search',
            'data-testid': 'entity-search-input',
          }}
          fullWidth
        />
      {results.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {results.map(r => (
            <li key={type === 'user' ? r.client_id : r.id}>
              {renderResult ? (
                renderResult(r, () => handleSelect(r))
              ) : (
                <div>
                  <Button
                    onClick={() => handleSelect(r)}
                    variant="outlined"
                    color="primary"
                  >
                    {getLabel(r)}
                  </Button>
                  {r.hasPassword && (
                    <Typography variant="caption">
                      {type === 'volunteer'
                        ? 'Volunteer has an online account'
                        : 'Client has an online account'}
                    </Typography>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        hasSearched && results.length === 0 && query.trim() !== '' && (
          <p>No search results.</p>
        )
      )}
      {type === 'user' &&
        results.length === 0 &&
        /^\d+$/.test(query.trim()) &&
        onNotFound && (
          <Button
            onClick={() => onNotFound(query.trim())}
            variant="outlined"
            color="primary"
          >
            {`Add Client ${query.trim()}`}
          </Button>
        )}
      <FeedbackSnackbar
        open={!!error}
        onClose={() => setError('')}
        message={error}
        severity="error"
      />
    </div>
  );
}

