import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import SearchPage from './pages/SearchPage'
import KnowledgePage from './pages/KnowledgePage'
import DistributionPage from './pages/DistributionPage'
import CalculatorPage from './pages/CalculatorPage'
import FunctionLabPage from './pages/FunctionLabPage'
import AiChatPage from './pages/AiChatPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/knowledge/:slug?" element={<KnowledgePage />} />
        <Route path="/distributions" element={<DistributionPage />} />
        <Route path="/distribution/:slug" element={<DistributionPage />} />
        <Route path="/calculator" element={<CalculatorPage />} />
        <Route path="/function-lab" element={<FunctionLabPage />} />
        <Route path="/ai" element={<AiChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
