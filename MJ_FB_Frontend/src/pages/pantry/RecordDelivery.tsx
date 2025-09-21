import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import Delete from '@mui/icons-material/Delete';
import { LoadingButton } from '@mui/lab';
import Page from '../../components/Page';
import PantryQuickLinks from '../../components/PantryQuickLinks';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import { getDeliveryCategories } from '../../api/deliveryCategories';
import { createDeliveryOrder } from '../../api/deliveryOrders';
import { getApiErrorMessage } from '../../api/client';
import type {
  DeliveryCategory,
  DeliveryOrderSelectionInput,
  DeliveryOrderStatus,
} from '../../types';

const STATUS_OPTIONS: { value: DeliveryOrderStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

interface ItemOption {
  id: number;
  name: string;
  category: string;
}

interface ItemRow {
  itemId: number | null;
  quantity: string;
}

interface ItemRowErrors {
  itemId?: string;
  quantity?: string;
}

interface FormErrors {
  clientId?: string;
  address?: string;
  phone?: string;
  email?: string;
  scheduledFor?: string;
}

export default function RecordDelivery() {
  const [clientId, setClientId] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<DeliveryOrderStatus>('completed');
  const [scheduledFor, setScheduledFor] = useState('');
  const [notes, setNotes] = useState('');
  const [categories, setCategories] = useState<DeliveryCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState('');
  const [itemRows, setItemRows] = useState<ItemRow[]>([{ itemId: null, quantity: '1' }]);
  const [itemErrors, setItemErrors] = useState<ItemRowErrors[]>([{}]);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  useEffect(() => {
    let active = true;
    setCategoriesLoading(true);
    getDeliveryCategories()
      .then(data => {
        if (!active) return;
        setCategories(data);
        setCategoriesError('');
      })
      .catch(err => {
        if (!active) return;
        const message = getApiErrorMessage(
          err,
          'We could not load delivery categories. Item selection will be disabled.',
        );
        setCategoriesError(message);
        setCategories([]);
      })
      .finally(() => {
        if (active) setCategoriesLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const itemOptions = useMemo<ItemOption[]>(() => {
    return categories.flatMap(category =>
      category.items.map(item => ({
        id: item.id,
        name: item.name,
        category: category.name,
      })),
    );
  }, [categories]);

  const handleItemChange = (
    index: number,
    option: ItemOption | null,
  ) => {
    setItemRows(prev =>
      prev.map((row, rowIndex) =>
        rowIndex === index ? { ...row, itemId: option ? option.id : null } : row,
      ),
    );
    setItemErrors(prev =>
      prev.map((error, rowIndex) =>
        rowIndex === index ? { ...error, itemId: undefined } : error,
      ),
    );
  };

  const handleQuantityChange = (index: number, value: string) => {
    setItemRows(prev =>
      prev.map((row, rowIndex) =>
        rowIndex === index ? { ...row, quantity: value } : row,
      ),
    );
    setItemErrors(prev =>
      prev.map((error, rowIndex) =>
        rowIndex === index ? { ...error, quantity: undefined } : error,
      ),
    );
  };

  const handleAddItemRow = () => {
    setItemRows(prev => [...prev, { itemId: null, quantity: '1' }]);
    setItemErrors(prev => [...prev, {}]);
  };

  const handleRemoveItemRow = (index: number) => {
    setItemRows(prev => prev.filter((_, rowIndex) => rowIndex !== index));
    setItemErrors(prev => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const resetForm = () => {
    setClientId('');
    setAddress('');
    setPhone('');
    setEmail('');
    setStatus('completed');
    setScheduledFor('');
    setNotes('');
    setItemRows([{ itemId: null, quantity: '1' }]);
    setItemErrors([{}]);
    setFormErrors({});
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setApiError('');

    const trimmedAddress = address.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();
    const trimmedNotes = notes.trim();

    const nextFormErrors: FormErrors = {};
    const nextItemErrors: ItemRowErrors[] = itemRows.map(() => ({}));

    const parsedClientId = Number.parseInt(clientId, 10);
    if (!clientId.trim()) {
      nextFormErrors.clientId = 'Client ID is required';
    } else if (Number.isNaN(parsedClientId) || parsedClientId <= 0) {
      nextFormErrors.clientId = 'Enter a valid client ID';
    }

    if (!trimmedAddress) {
      nextFormErrors.address = 'Address is required';
    }

    if (!trimmedPhone) {
      nextFormErrors.phone = 'Phone number is required';
    }

    if (trimmedEmail && !/^.+@.+\..+$/.test(trimmedEmail)) {
      nextFormErrors.email = 'Enter a valid email address';
    }

    let scheduledForIso: string | null = null;
    if (scheduledFor) {
      const parsedScheduled = new Date(scheduledFor);
      if (Number.isNaN(parsedScheduled.getTime())) {
        nextFormErrors.scheduledFor = 'Enter a valid date and time';
      } else {
        scheduledForIso = parsedScheduled.toISOString();
      }
    }

    const selections: DeliveryOrderSelectionInput[] = [];
    itemRows.forEach((row, index) => {
      if (row.itemId === null) {
        if (row.quantity.trim()) {
          nextItemErrors[index].itemId = 'Select an item for this row';
        }
        return;
      }

      const quantityValue = Number.parseInt(row.quantity, 10);
      if (Number.isNaN(quantityValue) || quantityValue <= 0) {
        nextItemErrors[index].quantity = 'Enter a quantity of at least 1';
        return;
      }

      selections.push({ itemId: row.itemId, quantity: quantityValue });
    });

    const hasItemErrors = nextItemErrors.some(error => Object.keys(error).length > 0);

    setFormErrors(nextFormErrors);
    setItemErrors(nextItemErrors);

    if (Object.keys(nextFormErrors).length > 0 || hasItemErrors) {
      return;
    }

    if (parsedClientId <= 0) {
      return;
    }

    setSubmitting(true);
    try {
      await createDeliveryOrder({
        clientId: parsedClientId,
        address: trimmedAddress,
        phone: trimmedPhone,
        email: trimmedEmail || null,
        status,
        scheduledFor: scheduledForIso,
        notes: trimmedNotes || null,
        selections,
      });
      resetForm();
      setSnackbar({
        open: true,
        severity: 'success',
        message: 'Delivery recorded successfully.',
      });
    } catch (err) {
      const message = getApiErrorMessage(
        err,
        'We could not record this delivery. Please try again.',
      );
      setApiError(message);
      setSnackbar({ open: true, severity: 'error', message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page title="Record Delivery" header={<PantryQuickLinks />}> 
      <FeedbackSnackbar
        open={snackbar.open}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        message={snackbar.message}
        severity={snackbar.severity}
      />
      <Box
        component="form"
        onSubmit={handleSubmit}
        noValidate
        sx={{ maxWidth: 720 }}
      >
        <Stack spacing={3}>
          <Typography color="text.secondary">
            Log the details of a completed delivery so the client record stays up to date.
          </Typography>

          {apiError && (
            <Alert severity="error">{apiError}</Alert>
          )}

          <Card>
            <CardHeader title="Delivery information" />
            <CardContent>
              <Stack spacing={3}>
                <Stack spacing={2}>
                  <TextField
                    label="Client ID"
                    value={clientId}
                    onChange={event => setClientId(event.target.value)}
                    required
                    error={Boolean(formErrors.clientId)}
                    helperText={formErrors.clientId}
                    type="number"
                    inputProps={{ min: 1 }}
                  />
                  <TextField
                    label="Delivery address"
                    value={address}
                    onChange={event => setAddress(event.target.value)}
                    required
                    error={Boolean(formErrors.address)}
                    helperText={formErrors.address}
                  />
                  <TextField
                    label="Phone number"
                    value={phone}
                    onChange={event => setPhone(event.target.value)}
                    required
                    error={Boolean(formErrors.phone)}
                    helperText={formErrors.phone}
                  />
                  <TextField
                    label="Email (optional)"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    error={Boolean(formErrors.email)}
                    helperText={formErrors.email}
                    type="email"
                  />
                </Stack>

                <Divider />

                <Stack spacing={2}>
                  <TextField
                    select
                    label="Status"
                    value={status}
                    onChange={event => setStatus(event.target.value as DeliveryOrderStatus)}
                  >
                    {STATUS_OPTIONS.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Scheduled for"
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={event => setScheduledFor(event.target.value)}
                    error={Boolean(formErrors.scheduledFor)}
                    helperText={formErrors.scheduledFor || 'Optional. Use local time.'}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="Notes (optional)"
                    value={notes}
                    onChange={event => setNotes(event.target.value)}
                    multiline
                    minRows={3}
                  />
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Items delivered" />
            <CardContent>
              <Stack spacing={2}>
                {categoriesError && (
                  <Alert severity="error">{categoriesError}</Alert>
                )}
                {categoriesLoading ? (
                  <Box display="flex" justifyContent="center" py={2}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {itemOptions.length === 0 && !categoriesError && (
                      <Typography color="text.secondary">
                        No delivery items are currently available.
                      </Typography>
                    )}
                    {itemRows.map((row, index) => {
                      const selectedOption = row.itemId
                        ? itemOptions.find(option => option.id === row.itemId) ?? null
                        : null;
                      return (
                        <Stack
                          key={index}
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={2}
                          alignItems={{ xs: 'stretch', sm: 'flex-start' }}
                        >
                          <Autocomplete
                            options={itemOptions}
                            value={selectedOption}
                            onChange={(_event, option) =>
                              handleItemChange(index, option)
                            }
                            getOptionLabel={option => `${option.name} — ${option.category}`}
                            renderInput={params => (
                              <TextField
                                {...params}
                                label="Item"
                                error={Boolean(itemErrors[index]?.itemId)}
                                helperText={itemErrors[index]?.itemId}
                              />
                            )}
                            disabled={itemOptions.length === 0}
                          />
                          <TextField
                            label="Quantity"
                            type="number"
                            value={row.quantity}
                            onChange={event => handleQuantityChange(index, event.target.value)}
                            error={Boolean(itemErrors[index]?.quantity)}
                            helperText={itemErrors[index]?.quantity}
                            inputProps={{ min: 1 }}
                            sx={{ width: { xs: '100%', sm: 160 } }}
                          />
                          <IconButton
                            aria-label="Remove item"
                            onClick={() => handleRemoveItemRow(index)}
                            disabled={itemRows.length === 1}
                            sx={{ mt: { xs: 0, sm: 0.5 } }}
                          >
                            <Delete />
                          </IconButton>
                        </Stack>
                      );
                    })}
                    <Box>
                      <Button
                        type="button"
                        variant="outlined"
                        startIcon={<Add />}
                        onClick={handleAddItemRow}
                        disabled={itemOptions.length === 0}
                      >
                        Add item
                      </Button>
                    </Box>
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>

          <Box display="flex" justifyContent="flex-end">
            <LoadingButton
              type="submit"
              variant="contained"
              size="medium"
              loading={submitting}
            >
              Save delivery
            </LoadingButton>
          </Box>
        </Stack>
      </Box>
    </Page>
  );
}
