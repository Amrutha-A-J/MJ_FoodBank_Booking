import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import {
  API_BASE,
  apiFetch,
  getApiErrorMessage,
  handleResponse,
} from '../../api/client';
import type { DeliveryCategory, DeliveryItem } from '../../types';

type QuantityState = Record<number, number>;

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
};

type FormErrors = {
  address?: string;
  phone?: string;
  email?: string;
  items?: string;
};

const PHONE_REGEX = /^\+?[0-9 ()-]{7,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function resolveCategoryLimit(category: DeliveryCategory): number {
  const rawLimit =
    category.limit ??
    category.maxItems ??
    category.maxSelections ??
    category.limitPerOrder ??
    0;
  return rawLimit && rawLimit > 0 ? rawLimit : Number.POSITIVE_INFINITY;
}

function resolveItemLimit(item: DeliveryItem): number | null {
  const rawLimit = item.maxQuantity ?? item.maxPerOrder ?? null;
  return rawLimit && rawLimit > 0 ? rawLimit : null;
}

function sanitizeQuantity(value: string): number {
  if (!value) return 0;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
}

export default function BookDelivery() {
  const [categories, setCategories] = useState<DeliveryCategory[]>([]);
  const [selectedQuantities, setSelectedQuantities] = useState<QuantityState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    let active = true;
    async function loadCategories() {
      setLoading(true);
      try {
        const res = await apiFetch(`${API_BASE}/delivery/categories`);
        const data = await handleResponse<DeliveryCategory[]>(res);
        if (active) {
          setCategories(data);
          setError('');
        }
      } catch (err) {
        if (active) {
          const message = getApiErrorMessage(err);
          setError(message);
          setSnackbar({ open: true, message, severity: 'error' });
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadCategories();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const validIds = new Set<number>();
    categories.forEach(category => {
      category.items.forEach(item => validIds.add(item.id));
    });
    setSelectedQuantities(prev => {
      const next: QuantityState = {};
      Object.entries(prev).forEach(([id, quantity]) => {
        const itemId = Number(id);
        if (validIds.has(itemId) && quantity > 0) {
          next[itemId] = quantity;
        }
      });
      return next;
    });
  }, [categories]);

  const categoryTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    categories.forEach(category => {
      totals[category.id] = category.items.reduce(
        (sum, item) => sum + (selectedQuantities[item.id] ?? 0),
        0,
      );
    });
    return totals;
  }, [categories, selectedQuantities]);

  const hasSelections = useMemo(
    () => Object.values(selectedQuantities).some(quantity => quantity > 0),
    [selectedQuantities],
  );

  useEffect(() => {
    if (hasSelections) {
      setFormErrors(prev => ({ ...prev, items: undefined }));
    }
  }, [hasSelections]);

  const handleQuantityChange = (
    category: DeliveryCategory,
    item: DeliveryItem,
    value: string,
  ) => {
    const quantity = sanitizeQuantity(value);
    const categoryLimit = resolveCategoryLimit(category);
    const itemLimit = resolveItemLimit(item);

    setSelectedQuantities(prev => {
      const otherSelected = category.items.reduce((sum, categoryItem) => {
        if (categoryItem.id === item.id) return sum;
        return sum + (prev[categoryItem.id] ?? 0);
      }, 0);

      let allowed = quantity;
      if (Number.isFinite(categoryLimit)) {
        allowed = Math.min(allowed, Math.max(0, categoryLimit - otherSelected));
      }
      if (itemLimit !== null) {
        allowed = Math.min(allowed, itemLimit);
      }

      const next = { ...prev };
      if (allowed > 0) {
        next[item.id] = allowed;
      } else {
        delete next[item.id];
      }
      return next;
    });
  };

  const remainingSelections = (category: DeliveryCategory) => {
    const limit = resolveCategoryLimit(category);
    if (!Number.isFinite(limit)) return null;
    const total = categoryTotals[category.id] ?? 0;
    return Math.max(0, limit - total);
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    const trimmedAddress = address.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();

    if (!trimmedAddress) {
      nextErrors.address = 'Address is required';
    }
    if (!trimmedPhone) {
      nextErrors.phone = 'Phone number is required';
    } else if (!PHONE_REGEX.test(trimmedPhone)) {
      nextErrors.phone = 'Enter a valid phone number';
    }
    if (!trimmedEmail) {
      nextErrors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      nextErrors.email = 'Enter a valid email address';
    }
    if (!hasSelections) {
      nextErrors.items = 'Select at least one item to continue';
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    const payload = {
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim(),
      items: Object.entries(selectedQuantities)
        .filter(([, quantity]) => quantity > 0)
        .map(([itemId, quantity]) => ({
          itemId: Number(itemId),
          quantity,
        })),
    };

    setSubmitting(true);
    try {
      const res = await apiFetch(`${API_BASE}/delivery/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await handleResponse(res);
      setSnackbar({
        open: true,
        message: 'Delivery request submitted',
        severity: 'success',
      });
      setAddress('');
      setPhone('');
      setEmail('');
      setSelectedQuantities({});
      setFormErrors({});
    } catch (err) {
      const message = getApiErrorMessage(err);
      setSnackbar({ open: true, message, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container
      component="form"
      onSubmit={handleSubmit}
      maxWidth="md"
      sx={{ py: 4 }}
    >
      <FeedbackSnackbar
        open={snackbar.open}
        onClose={handleSnackbarClose}
        message={snackbar.message}
        severity={snackbar.severity}
      />
      <Typography variant="h4" component="h1" gutterBottom>
        Book Delivery
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Choose the items you would like delivered and confirm your contact
        information. We will follow up with your delivery details.
      </Typography>

      {error && (
        <Box mb={3}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Stack spacing={3}>
            {categories.map(category => {
              const limit = resolveCategoryLimit(category);
              const remaining = remainingSelections(category);
              return (
                <Card key={category.id}>
                  <CardHeader
                    title={category.name}
                    subheader={
                      Number.isFinite(limit)
                        ? `Select up to ${limit} items`
                        : 'No item limit'
                    }
                  />
                  <CardContent>
                    {category.description && (
                      <Typography color="text.secondary" sx={{ mb: 2 }}>
                        {category.description}
                      </Typography>
                    )}
                    <Grid container spacing={2}>
                      {category.items.map(item => {
                        const quantity = selectedQuantities[item.id] ?? 0;
                        const itemLimit = resolveItemLimit(item);
                        return (
                          <Grid key={item.id} size={{ xs: 12, sm: 6 }}>
                            <TextField
                              fullWidth
                              type="number"
                              label={`${item.name} quantity`}
                              value={quantity}
                              onChange={event =>
                                handleQuantityChange(
                                  category,
                                  item,
                                  event.target.value,
                                )
                              }
                              inputProps={{
                                min: 0,
                                ...(itemLimit ? { max: itemLimit } : {}),
                              }}
                            />
                            {item.description && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 1 }}
                              >
                                {item.description}
                              </Typography>
                            )}
                            {itemLimit && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 1 }}
                              >
                                {`Maximum ${itemLimit} per order`}
                              </Typography>
                            )}
                          </Grid>
                        );
                      })}
                    </Grid>
                    {Number.isFinite(limit) && (
                      <Typography variant="body2" sx={{ mt: 2 }}>
                        Remaining selections: {remaining ?? 0} of {limit}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Stack>

          {categories.length === 0 && !error && (
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              No delivery items are currently available.
            </Typography>
          )}

          {formErrors.items && (
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              {formErrors.items}
            </Typography>
          )}

          <Divider sx={{ my: 4 }} />

          <Typography variant="h5" component="h2" gutterBottom>
            Contact information
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Delivery address"
                value={address}
                onChange={event => setAddress(event.target.value)}
                error={Boolean(formErrors.address)}
                helperText={formErrors.address}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Phone number"
                value={phone}
                onChange={event => setPhone(event.target.value)}
                error={Boolean(formErrors.phone)}
                helperText={formErrors.phone}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                error={Boolean(formErrors.email)}
                helperText={formErrors.email}
              />
            </Grid>
          </Grid>

          <Box display="flex" justifyContent="flex-end">
            <Button
              type="submit"
              variant="contained"
              size="medium"
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Submit Delivery Request'}
            </Button>
          </Box>
        </>
      )}
    </Container>
  );
}
