
import { useEmployeeFetch } from './employee/useEmployeeFetch';
import { useEmployeeCreate } from './employee/useEmployeeCreate';
import { useEmployeeUpdate } from './employee/useEmployeeUpdate';
import { useEmployeeDelete } from './employee/useEmployeeDelete';

export const useEmployeeOperations = () => {
  const { fetchEmployees, loading: fetchLoading } = useEmployeeFetch();
  const { createEmployee, loading: createLoading } = useEmployeeCreate();
  const { updateEmployee, toggleEmployeeStatus, loading: updateLoading } = useEmployeeUpdate();
  const { deleteEmployee, loading: deleteLoading } = useEmployeeDelete();

  // Combine all loading states
  const loading = fetchLoading || createLoading || updateLoading || deleteLoading;

  return {
    fetchEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    toggleEmployeeStatus,
    loading,
    isLoading: loading // Add alias for backward compatibility
  };
};
