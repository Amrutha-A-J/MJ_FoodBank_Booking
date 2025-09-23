import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
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
import { LoadingButton } from '@mui/lab';
import { Link as RouterLink } from 'react-router-dom';
import Page from '../../components/Page';
import PantryQuickLinks from '../../components/PantryQuickLinks';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import { getApiErrorMessage } from '../../api/client';
import { createDeliveryOrder } from '../../api/deliveryOrders';
import EntitySearch from '../../components/EntitySearch';
import type { UserSearchResult, UserByClientId } from '../../api/users';
import { getUserByClientId } from '../../api/users';
import FormDialog from '../../components/FormDialog';
import { resolveCategoryLimit, useDeliveryCategories } from '../../utils/deliveryCategories';
import type { DeliveryCategory, DeliveryItem } from '../../types';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
};

type SelectionState = Record<number, boolean>;

type FormErrors = {
  clientId?: string;
  address?: string;
  phone?: string;
  email?: string;
  addressConfirm?: string;
  phoneConfirm?: string;
  emailConfirm?: string;
};

const PHONE_REGEX = /^\+?[0-9 ()-]{7,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RecordDelivery() {
  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
    clearError: clearCategoriesError,
  } = useDeliveryCategories('We could not load delivery categories. Please try again.');
  const [selectedItems, setSelectedItems] = useState<SelectionState>({});
  const [selectedClient, setSelectedClient] = useState<UserSearchResult | null>(null);
  const [clientProfile, setClientProfile] = useState<UserByClientId | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [phoneConfirmed, setPhoneConfirmed] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);

  useEffect(() => {
    if (categoriesError) {
      setSnackbar({ open: true, message: categoriesError, severity: 'error' });
    }
  }, [categoriesError]);

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

  const trimmedEmail = email.trim();
  const allConfirmed =
    addressConfirmed && phoneConfirmed && (trimmedEmail === '' || emailConfirmed);

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
    clearCategoriesError();
  };

  const resetContact = () => {
    setAddress('');
    setPhone('');
    setEmail('');
    setAddressConfirmed(false);
    setPhoneConfirmed(false);
    setEmailConfirmed(false);
    setFormErrors({});
  };

  const resetForm = () => {
    setSelectedClient(null);
    setClientProfile(null);
    setSelectedItems({});
    setLoadingProfile(false);
    resetContact();
  };

  const handleClientSelect = async (client: UserSearchResult) => {
    setSelectedClient(client);
    setClientProfile(null);
    setSelectedItems({});
    setFormErrors({});
    setAddress('');
    setPhone(client.phone ?? '');
    setEmail(client.email ?? '');
    setAddressConfirmed(false);
    setPhoneConfirmed(false);
    setEmailConfirmed(false);
    setLoadingProfile(true);
    try {
      const profile = await getUserByClientId(String(client.client_id));
      setClientProfile(profile);
      setAddress(profile.address ?? '');
      setPhone(profile.phone ?? client.phone ?? '');
      setEmail(profile.email ?? client.email ?? '');
    } catch (err) {
      const message = getApiErrorMessage(
        err,
        'We could not load the client profile. Confirm details with the client before submitting.',
      );
      setSnackbar({ open: true, message, severity: 'error' });
    } finally {
      setLoadingProfile(false);
    }
  };

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

  const handleRadioChange = (category: DeliveryCategory, value: string) => {
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

  const validate = () => {
    const errors: FormErrors = {};
    if (!selectedClient) {
      errors.clientId = 'Select a client before submitting the request.';
    }
    const trimmedAddress = address.trim();
    if (!trimmedAddress) {
      errors.address = 'Enter the delivery address.';
    }
    if (!addressConfirmed) {
      errors.addressConfirm = 'Confirm the address with the client.';
    }
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      errors.phone = 'Enter a contact phone number.';
    } else if (!PHONE_REGEX.test(trimmedPhone)) {
      errors.phone = 'Enter a valid phone number.';
    }
    if (!phoneConfirmed) {
      errors.phoneConfirm = 'Confirm the phone number with the client.';
    }
    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = 'Enter a valid email address.';
    }
    if (trimmedEmail && !emailConfirmed) {
      errors.emailConfirm = 'Confirm the email with the client.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    const clientId = clientProfile?.clientId ?? selectedClient?.client_id;
    if (!clientId) {
      setSnackbar({
        open: true,
        message: 'We could not confirm the selected client. Please search again.',
        severity: 'error',
      });
      return;
    }

    const trimmedAddress = address.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmailLocal = trimmedEmail;
    const selections = Object.entries(selectedItems)
      .filter(([, selected]) => selected)
      .map(([itemId]) => ({ itemId: Number(itemId), quantity: 1 }));

    setSubmitting(true);
    try {
      await createDeliveryOrder({
        clientId: Number(clientId),
        address: trimmedAddress,
        phone: trimmedPhone,
        email: trimmedEmailLocal ? trimmedEmailLocal : null,
        selections,
      });
      setSnackbar({
        open: true,
        message: 'Delivery request submitted for processing.',
        severity: 'success',
      });
      setSuccessDialogOpen(true);
      resetForm();
    } catch (err) {
      const message = getApiErrorMessage(
        err,
        'We could not submit this delivery request. Please try again.',
      );
      setSnackbar({ open: true, message, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessDialogClose = () => {
    setSuccessDialogOpen(false);
  };

  const renderCategory = (category: DeliveryCategory) => {
    const limit = resolveCategoryLimit(category);
    const remaining = remainingSelections(category);
    const selectedId = category.items.find(item => selectedItems[item.id])?.id;
    const title = Number.isFinite(limit)
      ? `${category.name} (Select up to ${limit})`
      : category.name;

    return (
      <Card key={category.id} variant="outlined">
        <CardHeader title={title} />
        <CardContent>
          {category.description && (
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {category.description}
            </Typography>
          )}
          {Number.isFinite(limit) && (
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {`Select up to ${limit} ${limit === 1 ? 'item' : 'items'}.`}
            </Typography>
          )}
          {limit === 1 ? (
            <RadioGroup
              value={selectedId ? String(selectedId) : ''}
              onChange={event => handleRadioChange(category, event.target.value)}
            >
              {category.items.map(item => (
                <FormControlLabel
                  key={item.id}
                  value={item.id}
                  control={<Radio disabled={submitting || loadingProfile} />}
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
                        disabled={disable || submitting || loadingProfile}
                      />
                    }
                    label={item.name}
                  />
                );
              })}
            </FormGroup>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Page title="Record Delivery" header={<PantryQuickLinks />}>
      <FormDialog
        open={successDialogOpen}
        onClose={handleSuccessDialogClose}
        aria-labelledby="record-delivery-success-title"
        maxWidth="xs"
      >
        <DialogTitle id="record-delivery-success-title">
          Delivery request submitted
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            We added this request to the delivery queue. Dispatch will follow up to
            schedule the delivery.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleSuccessDialogClose} variant="contained" size="medium">
            Close
          </Button>
        </DialogActions>
      </FormDialog>

      <FeedbackSnackbar
        open={snackbar.open}
        onClose={handleSnackbarClose}
        message={snackbar.message}
        severity={snackbar.severity}
      />

      <Stack spacing={3} sx={{ maxWidth: 960 }}>
        <Typography variant="body1" color="text.secondary">
          Submit delivery requests on behalf of clients by confirming their contact
          details and grocery preferences. These requests move into the pending
          delivery workflow for follow-up.
        </Typography>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h5" component="h2">
                Find a client
              </Typography>
              <EntitySearch<UserSearchResult>
                type="user"
                placeholder="Search client by name or ID"
                onSelect={handleClientSelect}
                clearOnSelect
              />
              {loadingProfile && (
                <Box display="flex" alignItems="center" gap={1} color="text.secondary">
                  <CircularProgress size={20} />
                  <Typography>Loading client profile…</Typography>
                </Box>
              )}
              {selectedClient && (
                <Stack spacing={1}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Selected client
                  </Typography>
                  <Typography>
                    {selectedClient.name} (ID {selectedClient.client_id})
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Button
                      type="button"
                      variant="outlined"
                      size="medium"
                      onClick={resetForm}
                      disabled={submitting || loadingProfile}
                    >
                      Choose a different client
                    </Button>
                  </Stack>
                  {formErrors.clientId && (
                    <Typography color="error" variant="body2">
                      {formErrors.clientId}
                    </Typography>
                  )}
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>

        {selectedClient && (
          <Card>
            <CardContent>
              <Box component="form" onSubmit={handleSubmit} noValidate>
                <Stack spacing={3}>
                  <Stack spacing={1}>
                    <Typography variant="h5" component="h2">
                      Delivery items
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Confirm the categories requested by the client while enforcing
                      each category limit.
                    </Typography>
                    {categoriesError && (
                      <Typography color="error">{categoriesError}</Typography>
                    )}
                  </Stack>

                  {categoriesLoading ? (
                    <Box display="flex" justifyContent="center" py={4}>
                      <CircularProgress />
                    </Box>
                  ) : categories.length > 0 ? (
                    <Stack spacing={2}>
                      {categories.map(category => renderCategory(category))}
                    </Stack>
                  ) : (
                    <Typography color="text.secondary">
                      No delivery categories are currently available.
                    </Typography>
                  )}

                  <Divider />

                  <Stack spacing={1}>
                    <Typography variant="h5" component="h2">
                      Contact information
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Confirm the address and phone number with the client before
                      submitting. Email is optional but helps with follow-up.
                    </Typography>
                  </Stack>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                      <Stack spacing={1}>
                        <TextField
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
                          disabled={submitting || loadingProfile}
                          multiline
                          minRows={2}
                          required
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
                                disabled={submitting || loadingProfile}
                              />
                            }
                            label="Address confirmed with client"
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
                          disabled={submitting || loadingProfile}
                          required
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
                                disabled={submitting || loadingProfile}
                              />
                            }
                            label="Phone number confirmed with client"
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
                          label="Email (optional)"
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
                          disabled={submitting || loadingProfile}
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
                                disabled={submitting || loadingProfile || trimmedEmail === ''}
                              />
                            }
                            label={
                              trimmedEmail === ''
                                ? 'No email provided'
                                : 'Email confirmed with client'
                            }
                          />
                          {formErrors.emailConfirm && (
                            <FormHelperText>{formErrors.emailConfirm}</FormHelperText>
                          )}
                        </FormControl>
                      </Stack>
                    </Grid>
                  </Grid>

                  <Box
                    display="flex"
                    flexDirection={{ xs: 'column', sm: 'row' }}
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    justifyContent="flex-end"
                    gap={1}
                  >
                    <LoadingButton
                      type="submit"
                      variant="contained"
                      loading={submitting}
                      disabled={submitting || loadingProfile || !allConfirmed}
                      size="medium"
                    >
                      Submit delivery request
                    </LoadingButton>
                    {!allConfirmed && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ textAlign: { xs: 'left', sm: 'right' } }}
                      >
                        Confirm the address and phone number above before submitting.
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        )}

        <Button
          component={RouterLink}
          to="/pantry/deliveries"
          variant="text"
          size="medium"
          sx={{ alignSelf: 'flex-start' }}
        >
          Back to outstanding deliveries
        </Button>
      </Stack>
    </Page>
  );
}
