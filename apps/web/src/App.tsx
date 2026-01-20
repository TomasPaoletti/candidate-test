import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Chat } from './pages/Chat';
import { Dashboard } from './pages/Dashboard';

// ID de estudiante de prueba (hardcoded para desarrollo)
// En producción esto vendría de autenticación
const TEST_STUDENT_ID = '507f1f77bcf86cd799439011';

function App() {
  return (
    <Layout studentId={TEST_STUDENT_ID}>
      <Routes>
        <Route path='/' element={<Navigate to='/dashboard' replace />} />
        <Route
          path='/dashboard'
          element={<Dashboard studentId={TEST_STUDENT_ID} />}
        />
        <Route path='/chat' element={<Chat studentId={TEST_STUDENT_ID} />} />
        <Route
          path='/chat/:conversationId'
          element={<Chat studentId={TEST_STUDENT_ID} />}
        />
        <Route path='*' element={<Navigate to='/dashboard' replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
