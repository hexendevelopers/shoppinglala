import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';

const GET_CUSTOMER = gql`
  query GetCustomer($accessToken: String!) {
    customer(customerAccessToken: $accessToken) {
      firstName
      lastName 
      email
      phone
    }
  }
`;

const PersonalInformation = () => {
    // Retrieve access token from local storage
    let storedToken = null;
    try {
      const rawToken = localStorage.getItem('useraccessToken');
      storedToken = rawToken ? JSON.parse(rawToken) : null;
    } catch (error) {
      console.error("Error parsing access token from localStorage:", error);
    }
  
    const accessToken = storedToken?.accessToken;
  
    if (!accessToken) {
      return <div className="text-red-500 py-4">Access token not found. Please log in again.</div>;
    }
  
    const { loading, error, data } = useQuery(GET_CUSTOMER, {
      variables: { accessToken },
    });
  
    if (loading) return <div className="text-center py-4">Loading...</div>;
    if (error) return <div className="text-red-500 py-4">Error: {error.message}</div>;
  
    const { firstName, lastName, email, phone } = data.customer;
    return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Personal Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="info-item">
          <label className="block text-gray-600 font-medium">First Name:</label>
          <p className="text-gray-800">{firstName}</p>
        </div>
        <div className="info-item">
          <label className="block text-gray-600 font-medium">Last Name:</label>
          <p className="text-gray-800">{lastName}</p>
        </div>
        <div className="info-item">
          <label className="block text-gray-600 font-medium">Email:</label>
          <p className="text-gray-800">{email}</p>
        </div>
        <div className="info-item">
          <label className="block text-gray-600 font-medium">Phone:</label>
          <p className="text-gray-800">{phone || 'Not provided'}</p>
        </div>
      </div>
    </div>
  );
};

export default PersonalInformation;
