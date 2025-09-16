import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  Grid,
  Radio,
  RadioGroup,
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
import { useAuth } from '../../hooks/useAuth';
import { getUserProfile } from '../../api/users';

type SelectionState = Record<number, boolean>;

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
};

type FormErrors = {
  address?: string;
  phone?: string;
  email?: string;
  addressConfirm?: string;
  phoneConfirm?: string;
  emailConfirm?: string;
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

export default function BookDelivery() {
  const [categories, setCategories] = useState<DeliveryCategory[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectionState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [phoneConfirmed, setPhoneConfirmed] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });
  const { id: clientId } = useAuth();

  const allConfirmed = addressConfirmed && phoneConfirmed && emailConfirmed;

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      try {
        const profile = await getUserProfile();
        if (!active) return;
        setAddress(profile.address ?? '');
        setPhone(profile.phone ?? '');
        setEmail(profile.email ?? '');
        setAddressConfirmed(false);
        setPhoneConfirmed(false);
        setEmailConfirmed(false);
      } catch (err) {
        if (!active) return;
        const message = getApiErrorMessage(
          err,
          "We couldn't load your contact information. Please review it before submitting.",
        );
        setSnackbar({ open: true, message, severity: 'error' });
      }
    }
    void loadProfile();
    return () => {
      active = false;
    };
  }, []);

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
          const message = getApiErrorMessage(
            err,
            "We couldn't load your delivery options. Please try again.",
          );
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
    setSelectedItems(prev => {
      const next: SelectionState = {};
      Object.entries(prev).forEach(([id, selected]) => {
        const itemId = Number(id);
        if (validIds.has(itemId) && selected) {
          next[itemId] = true;
        }
      });
      return next;
    });
  }, [categories]);

  const categoryTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    categories.forEach(category => {
      totals[category.id] = category.items.reduce(
        (sum, item) => sum + (selectedItems[item.id] ? 1 : 0),
        0,
      );
    });
    return totals;
  }, [categories, selectedItems]);

  const handleCheckboxChange = (item: DeliveryItem) => {
    setSelectedItems(prev => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = true;
      }
      return next;
    });
  };

  const handleRadioChange = (
    category: DeliveryCategory,
    value: string,
  ) => {
    const itemId = Number(value);
    setSelectedItems(prev => {
      const next: SelectionState = { ...prev };
      category.items.forEach(item => {
        delete next[item.id];
      });
      if (!Number.isNaN(itemId)) {
        next[itemId] = true;
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
    if (!addressConfirmed) {
      nextErrors.addressConfirm = 'Please confirm your address';
    }
    if (!phoneConfirmed) {
      nextErrors.phoneConfirm = 'Please confirm your phone number';
    }
    if (!emailConfirmed) {
      nextErrors.emailConfirm = 'Please confirm your email';
    }
    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    if (!clientId) {
      setSnackbar({
        open: true,
        severity: 'error',
        message: 'We could not confirm your account. Please sign in again.',
      });
      return;
    }

    const trimmedAddress = address.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();
    const payload = {
      clientId,
      address: trimmedAddress,
      phone: trimmedPhone,
      email: trimmedEmail,
      selections: Object.entries(selectedItems)
        .filter(([, selected]) => selected)
        .map(([itemId]) => ({
          itemId: Number(itemId),
          quantity: 1,
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
      setAddress(trimmedAddress);
      setPhone(trimmedPhone);
      setEmail(trimmedEmail);
      setSelectedItems({});
      setFormErrors({});
      setAddressConfirmed(false);
      setPhoneConfirmed(false);
      setEmailConfirmed(false);
      setEditingContact(false);
    } catch (err) {
      const message = getApiErrorMessage(
        err,
        "We couldn't submit your delivery request. Please try again.",
      );
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
              const selectedId = category.items.find(item => selectedItems[item.id])?.id;
              return (
                <Card key={category.id}>
                  <CardHeader
                    title={`${category.name}$${Number.isFinite(limit) ? ` (Select ${limit})` : ''}`.replace('$', '')}
                  />
                  <CardContent>
                    {category.description && (
                      <Typography color="text.secondary" sx={{ mb: 2 }}>
                        {category.description}
                      </Typography>
                    )}
                    {Number.isFinite(limit) && (
                      <Typography color="error" sx={{ mb: 2 }}>
                        {`Select exactly ${limit} ${limit === 1 ? 'choice' : 'choices'}.`}
                      </Typography>
                    )}
                    {limit === 1 ? (
                      <RadioGroup
                        value={selectedId ? String(selectedId) : ''}
                        onChange={event =>
                          handleRadioChange(category, event.target.value)
                        }
                      >
                        {category.items.map(item => (
                          <FormControlLabel
                            key={item.id}
                            value={item.id}
                            control={<Radio />}
                            label={item.name}
                          />
                        ))}
                      </RadioGroup>
                    ) : (
                      <FormGroup>
                        {category.items.map(item => {
                          const checked = !!selectedItems[item.id];
                          const disable = !checked && remaining === 0;
                          return (
                            <FormControlLabel
                              key={item.id}
                              control={
                                <Checkbox
                                  checked={checked}
                                  onChange={() => handleCheckboxChange(item)}
                                />
                              }
                              label={item.name}
                              disabled={disable}
                            />
                          );
                        })}
                      </FormGroup>
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

          <Divider sx={{ my: 4 }} />

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
            sx={{ mb: 2 }}
          >
            <Typography variant="h5" component="h2">
              Contact information
            </Typography>
            <Button
              type="button"
              variant="outlined"
              onClick={() => {
                setEditingContact(true);
                setAddressConfirmed(false);
                setPhoneConfirmed(false);
                setEmailConfirmed(false);
              }}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
              disabled={editingContact}
            >
              Edit contact info
            </Button>
          </Stack>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12 }}>
              <Stack spacing={1}>
                <TextField
                  fullWidth
                  label="Delivery address"
                  value={address}
                  onChange={event => {
                    setAddress(event.target.value);
                    setAddressConfirmed(false);
                    setFormErrors(prev => ({
                      ...prev,
                      address: undefined,
                      addressConfirm: undefined,
                    }));
                  }}
                  error={Boolean(formErrors.address)}
                  helperText={formErrors.address}
                  InputProps={{ readOnly: !editingContact }}
                />
                <FormControl error={Boolean(formErrors.addressConfirm)}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={addressConfirmed}
                        onChange={event => {
                          setAddressConfirmed(event.target.checked);
                          setFormErrors(prev => ({
                            ...prev,
                            addressConfirm: undefined,
                          }));
                        }}
                      />
                    }
                    label="Address is correct"
                  />
                  {formErrors.addressConfirm && (
                    <FormHelperText>{formErrors.addressConfirm}</FormHelperText>
                  )}
                </FormControl>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={1}>
                <TextField
                  fullWidth
                  label="Phone number"
                  value={phone}
                  onChange={event => {
                    setPhone(event.target.value);
                    setPhoneConfirmed(false);
                    setFormErrors(prev => ({
                      ...prev,
                      phone: undefined,
                      phoneConfirm: undefined,
                    }));
                  }}
                  error={Boolean(formErrors.phone)}
                  helperText={formErrors.phone}
                  InputProps={{ readOnly: !editingContact }}
                />
                <FormControl error={Boolean(formErrors.phoneConfirm)}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={phoneConfirmed}
                        onChange={event => {
                          setPhoneConfirmed(event.target.checked);
                          setFormErrors(prev => ({
                            ...prev,
                            phoneConfirm: undefined,
                          }));
                        }}
                      />
                    }
                    label="Phone number is correct"
                  />
                  {formErrors.phoneConfirm && (
                    <FormHelperText>{formErrors.phoneConfirm}</FormHelperText>
                  )}
                </FormControl>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={1}>
                <TextField
                  fullWidth
                  label="Email"
                  value={email}
                  onChange={event => {
                    setEmail(event.target.value);
                    setEmailConfirmed(false);
                    setFormErrors(prev => ({
                      ...prev,
                      email: undefined,
                      emailConfirm: undefined,
                    }));
                  }}
                  error={Boolean(formErrors.email)}
                  helperText={formErrors.email}
                  InputProps={{ readOnly: !editingContact }}
                />
                <FormControl error={Boolean(formErrors.emailConfirm)}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={emailConfirmed}
                        onChange={event => {
                          setEmailConfirmed(event.target.checked);
                          setFormErrors(prev => ({
                            ...prev,
                            emailConfirm: undefined,
                          }));
                        }}
                      />
                    }
                    label="Email is correct"
                  />
                  {formErrors.emailConfirm && (
                    <FormHelperText>{formErrors.emailConfirm}</FormHelperText>
                  )}
                </FormControl>
              </Stack>
            </Grid>
          </Grid>

          {editingContact && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: { xs: 'stretch', sm: 'flex-end' },
                mb: 3,
              }}
            >
              <Button
                type="button"
                variant="contained"
                onClick={() => setEditingContact(false)}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Save contact info
              </Button>
            </Box>
          )}

          <Box display="flex" justifyContent="flex-end">
            <Button
              type="submit"
              variant="contained"
              size="medium"
              disabled={submitting || !allConfirmed}
            >
              {submitting ? 'Submitting…' : 'Submit Delivery Request'}
            </Button>
            {!allConfirmed && (
              <Typography variant="body2" color="text.secondary">
                Confirm your address, phone, and email above to submit.
              </Typography>
            )}
          </Stack>
        </>
      )}
    </Container>
  );
}
