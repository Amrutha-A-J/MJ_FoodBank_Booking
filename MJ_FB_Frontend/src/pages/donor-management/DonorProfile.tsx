import Page from '../../components/Page';
import { useParams } from 'react-router-dom';

export default function DonorProfile() {
  const { id } = useParams();
  return (
    <Page title="Donor Profile">
      <div>Donation history for donor {id}.</div>
    </Page>
  );
}

