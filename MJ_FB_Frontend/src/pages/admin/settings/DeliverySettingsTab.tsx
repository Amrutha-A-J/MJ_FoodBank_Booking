import { useCallback, useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardHeader,
  CardContent,
  TextField,
  Button,
  Box,
  Stack,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { AlertColor } from '@mui/material';
import FeedbackSnackbar from '../../../components/FeedbackSnackbar';
import {
  getDeliveryCategories,
  createDeliveryCategory,
  updateDeliveryCategory,
  deleteDeliveryCategory,
  createDeliveryCategoryItem,
  updateDeliveryCategoryItem,
  deleteDeliveryCategoryItem,
  type DeliveryCategory,
  type DeliveryCategoryItem,
} from '../../../api/deliveryCategories';

export default function DeliverySettingsTab() {
  const [snackbar, setSnackbar] = useState<
    { message: string; severity: AlertColor } | null
  >(null);
  const [categories, setCategories] = useState<DeliveryCategory[]>([]);
  const [categoryDialog, setCategoryDialog] = useState<{
    open: boolean;
    id: number | null;
    name: string;
    maxItems: string;
  }>({ open: false, id: null, name: '', maxItems: '0' });
  const [categoryDialogErrors, setCategoryDialogErrors] = useState<
    Partial<Record<'name' | 'maxItems', string>>
  >({});
  const [itemDialog, setItemDialog] = useState<{
    open: boolean;
    categoryId: number | null;
    itemId: number | null;
    name: string;
  }>({ open: false, categoryId: null, itemId: null, name: '' });
  const [itemDialogError, setItemDialogError] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<DeliveryCategory | null>(
    null,
  );
  const [itemToDelete, setItemToDelete] = useState<
    { categoryId: number; item: DeliveryCategoryItem } | null
  >(null);

  const loadCategories = useCallback(async () => {
    try {
      const data = await getDeliveryCategories();
      setCategories(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load delivery categories';
      setSnackbar({ message, severity: 'error' });
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const openCreateCategoryDialog = () => {
    setCategoryDialog({ open: true, id: null, name: '', maxItems: '0' });
    setCategoryDialogErrors({});
  };

  const openEditCategoryDialog = (category: DeliveryCategory) => {
    setCategoryDialog({
      open: true,
      id: category.id,
      name: category.name,
      maxItems: String(category.maxItems ?? 0),
    });
    setCategoryDialogErrors({});
  };

  const closeCategoryDialog = () => {
    setCategoryDialog({ open: false, id: null, name: '', maxItems: '0' });
    setCategoryDialogErrors({});
  };

  const validateCategoryField = (field: 'name' | 'maxItems', value: string) => {
    let error = '';
    if (field === 'name') {
      if (!value.trim()) error = 'Name is required';
    } else {
      if (value === '') error = 'Max items is required';
      else if (!Number.isFinite(Number(value)) || Number(value) < 0)
        error = 'Max items must be 0 or more';
    }
    setCategoryDialogErrors(prev => {
      const next = { ...prev };
      if (error) next[field] = error;
      else delete next[field];
      return next;
    });
    return !error;
  };

  const handleSubmitCategory = async () => {
    const isNameValid = validateCategoryField('name', categoryDialog.name);
    const isMaxValid = validateCategoryField('maxItems', categoryDialog.maxItems);
    if (!isNameValid || !isMaxValid) return;

    try {
      const payload = {
        name: categoryDialog.name.trim(),
        maxItems: Number(categoryDialog.maxItems),
      };
      if (categoryDialog.id !== null)
        await updateDeliveryCategory(categoryDialog.id, payload);
      else await createDeliveryCategory(payload);
      closeCategoryDialog();
      await loadCategories();
      setSnackbar({
        message: categoryDialog.id !== null ? 'Category updated' : 'Category created',
        severity: 'success',
      });
    } catch (err: any) {
      setSnackbar({
        message: err.message || 'Failed to save category',
        severity: 'error',
      });
    }
  };

  const openItemDialog = (
    categoryId: number,
    item?: DeliveryCategoryItem,
  ) => {
    setItemDialog({
      open: true,
      categoryId,
      itemId: item?.id ?? null,
      name: item?.name ?? '',
    });
    setItemDialogError('');
  };

  const closeItemDialog = () => {
    setItemDialog({ open: false, categoryId: null, itemId: null, name: '' });
    setItemDialogError('');
  };

  const validateItemName = (value: string) => {
    let error = '';
    if (!value.trim()) error = 'Item name is required';
    setItemDialogError(error);
    return !error;
  };

  const handleSubmitItem = async () => {
    if (!validateItemName(itemDialog.name)) return;
    try {
      const payload = { name: itemDialog.name.trim() };
      if (itemDialog.itemId !== null)
        await updateDeliveryCategoryItem(
          itemDialog.categoryId!,
          itemDialog.itemId,
          payload,
        );
      else
        await createDeliveryCategoryItem(itemDialog.categoryId!, payload);
      closeItemDialog();
      await loadCategories();
      setSnackbar({
        message: itemDialog.itemId !== null ? 'Item updated' : 'Item added',
        severity: 'success',
      });
    } catch (err: any) {
      setSnackbar({
        message: err.message || 'Failed to save item',
        severity: 'error',
      });
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteDeliveryCategory(categoryToDelete.id);
      setCategoryToDelete(null);
      await loadCategories();
      setSnackbar({ message: 'Category deleted', severity: 'success' });
    } catch (err: any) {
      setSnackbar({
        message: err.message || 'Failed to delete category',
        severity: 'error',
      });
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDeliveryCategoryItem(
        itemToDelete.categoryId,
        itemToDelete.item.id,
      );
      setItemToDelete(null);
      await loadCategories();
      setSnackbar({ message: 'Item deleted', severity: 'success' });
    } catch (err: any) {
      setSnackbar({
        message: err.message || 'Failed to delete item',
        severity: 'error',
      });
    }
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid size={12}>
          <Card>
            <CardHeader
              title="Delivery categories"
              action={
                <Button
                  size="medium"
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openCreateCategoryDialog}
                >
                  Add category
                </Button>
              }
            />
            <CardContent>
              {categories.length === 0 ? (
                <Typography color="text.secondary">
                  No delivery categories yet. Add one to get started.
                </Typography>
              ) : (
                <List disablePadding>
                  {categories.map((category, index) => (
                    <Box key={category.id} sx={{ pb: 2 }}>
                      <ListItem
                        alignItems="flex-start"
                        disableGutters
                        secondaryAction={
                          <Stack direction="row" spacing={1}>
                            <IconButton
                              aria-label={`Edit ${category.name}`}
                              onClick={() => openEditCategoryDialog(category)}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              aria-label={`Delete ${category.name}`}
                              onClick={() => setCategoryToDelete(category)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Stack>
                        }
                      >
                        <ListItemText
                          primary={category.name}
                          secondary={`Max items per delivery: ${category.maxItems}`}
                        />
                      </ListItem>
                      <Box sx={{ pl: { xs: 0, sm: 4 }, pt: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                          Items
                        </Typography>
                        {category.items.length > 0 ? (
                          <List disablePadding dense>
                            {category.items.map(item => (
                              <ListItem
                                key={item.id}
                                disableGutters
                                secondaryAction={
                                  <Stack direction="row" spacing={1}>
                                    <IconButton
                                      aria-label={`Edit ${item.name}`}
                                      onClick={() => openItemDialog(category.id, item)}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      aria-label={`Delete ${item.name}`}
                                      onClick={() =>
                                        setItemToDelete({ categoryId: category.id, item })
                                      }
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Stack>
                                }
                              >
                                <ListItemText primary={item.name} />
                              </ListItem>
                            ))}
                          </List>
                        ) : (
                          <Typography color="text.secondary">No items yet.</Typography>
                        )}
                        <Button
                          size="medium"
                          sx={{ mt: 1 }}
                          startIcon={<AddIcon />}
                          onClick={() => openItemDialog(category.id)}
                        >
                          Add item
                        </Button>
                      </Box>
                      {index < categories.length - 1 && <Divider sx={{ mt: 2 }} />}
                    </Box>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Dialog open={categoryDialog.open} onClose={closeCategoryDialog} fullWidth>
        <DialogTitle>
          {categoryDialog.id !== null ? 'Edit category' : 'Add category'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              size="medium"
              value={categoryDialog.name}
              onChange={event => {
                const value = event.target.value;
                setCategoryDialog(prev => ({ ...prev, name: value }));
                if (categoryDialogErrors.name) validateCategoryField('name', value);
              }}
              onBlur={event => validateCategoryField('name', event.target.value)}
              error={Boolean(categoryDialogErrors.name)}
              helperText={categoryDialogErrors.name}
            />
            <TextField
              label="Max items per delivery"
              size="medium"
              type="number"
              value={categoryDialog.maxItems}
              onChange={event => {
                const value = event.target.value;
                setCategoryDialog(prev => ({ ...prev, maxItems: value }));
                if (categoryDialogErrors.maxItems)
                  validateCategoryField('maxItems', value);
              }}
              onBlur={event => validateCategoryField('maxItems', event.target.value)}
              error={Boolean(categoryDialogErrors.maxItems)}
              helperText={categoryDialogErrors.maxItems}
              inputProps={{ min: 0 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button size="medium" onClick={closeCategoryDialog}>
            Cancel
          </Button>
          <Button size="medium" variant="contained" onClick={handleSubmitCategory}>
            {categoryDialog.id !== null ? 'Save changes' : 'Create category'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={itemDialog.open} onClose={closeItemDialog} fullWidth>
        <DialogTitle>{itemDialog.itemId !== null ? 'Edit item' : 'Add item'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Item name"
            size="medium"
            value={itemDialog.name}
            onChange={event => {
              const value = event.target.value;
              setItemDialog(prev => ({ ...prev, name: value }));
              if (itemDialogError) validateItemName(value);
            }}
            onBlur={event => validateItemName(event.target.value)}
            error={Boolean(itemDialogError)}
            helperText={itemDialogError}
          />
        </DialogContent>
        <DialogActions>
          <Button size="medium" onClick={closeItemDialog}>
            Cancel
          </Button>
          <Button size="medium" variant="contained" onClick={handleSubmitItem}>
            {itemDialog.itemId !== null ? 'Save changes' : 'Add item'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={categoryToDelete !== null} onClose={() => setCategoryToDelete(null)} fullWidth>
        <DialogTitle>Delete category</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete{' '}
            <strong>{categoryToDelete?.name}</strong>? This will also remove all
            of its items.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button size="medium" onClick={() => setCategoryToDelete(null)}>
            Cancel
          </Button>
          <Button
            size="medium"
            variant="contained"
            color="error"
            onClick={handleDeleteCategory}
          >
            Delete category
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={itemToDelete !== null} onClose={() => setItemToDelete(null)} fullWidth>
        <DialogTitle>Delete item</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete{' '}
            <strong>{itemToDelete?.item.name}</strong> from this category?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button size="medium" onClick={() => setItemToDelete(null)}>
            Cancel
          </Button>
          <Button
            size="medium"
            variant="contained"
            color="error"
            onClick={handleDeleteItem}
          >
            Delete item
          </Button>
        </DialogActions>
      </Dialog>
      <FeedbackSnackbar
        open={!!snackbar}
        onClose={() => setSnackbar(null)}
        message={snackbar?.message || ''}
        severity={snackbar?.severity}
      />
    </>
  );
}

