import { Navigate } from 'react-router-dom';
import { useContext } from 'react';

import { AuthContext } from '../../context/AuthContext';

const ProtectedRoute = ({ children }) => {

  const { isLoggedIn } = useContext(AuthContext);

  if(isLoggedIn === false){
        return <Navigate to="/login" />
  }
  return children ;
}

export default ProtectedRoute ;
