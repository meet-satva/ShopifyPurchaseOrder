import React, { useState, useCallback, useEffect } from 'react';
import {
  Card,
  Button,
  TextField,
  Stack,
  Banner,
  ProgressBar,
  Badge,
  Spinner,
  Modal,
  TextContainer,
  FormLayout,
  Select,
} from '@shopify/polaris';

const POSeederApp = () => {
  const [shopDomain, setShopDomain] = useState('');
  const [poCount, setPoCount] = useState('50');
  const [sessionSaved, setSessionSaved] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completedPOs, setCompletedPOs] = useState(0);
  const [totalPOs, setTotalPOs] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [sessionBrowserReady, setSessionBrowserReady] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);

  // Load saved session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/po-seeder/check-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shopDomain: localStorage.getItem('po_shop_domain') || '' }),
        });
        const data = await response.json();
        if (data.sessionExists) {
          setSessionSaved(true);
          setShopDomain(data.shopDomain);
          setSessionBrowserReady(true);
        }
      } catch (err) {
        console.log('No session found');
      }
    };
    checkSession();
  }, []);

  const handleCreateSession = async () => {
    if (!shopDomain.trim()) {
      setError('Please enter a valid shop domain');
      return;
    }

    if (!shopDomain.includes('myshopify.com')) {
      setError('Shop domain must be in format: yourstore.myshopify.com');
      return;
    }

    setLoadingSession(true);
    setError('');

    try {
      const response = await fetch('/api/po-seeder/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopDomain }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('po_shop_domain', shopDomain);
        setSessionSaved(true);
        setSessionBrowserReady(true);
        setSuccess('Browser session created successfully! You can now generate POs.');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to create session. Check browser console for details.');
      }
    } catch (err) {
      setError(`Error: ${err.message}. Make sure your Shopify admin is accessible.`);
    } finally {
      setLoadingSession(false);
    }
  };

  const handleGeneratePOs = async () => {
    if (!sessionSaved) {
      setError('Please save a browser session first');
      return;
    }

    const count = parseInt(poCount, 10);
    if (isNaN(count) || count < 1 || count > 5000) {
      setError('Enter a number between 1 and 5000');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setCompletedPOs(0);
    setTotalPOs(count);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/po-seeder/generate-pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopDomain,
          poCount: count,
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            const event = JSON.parse(jsonStr);

            if (event.type === 'progress') {
              setCompletedPOs(event.completed);
              setProgress((event.completed / count) * 100);
            } else if (event.type === 'complete') {
              setSuccess(`Successfully generated ${event.completed} POs!`);
              setIsGenerating(false);
            } else if (event.type === 'error') {
              setError(event.error);
              setIsGenerating(false);
            }
          }
        }
      }
    } catch (err) {
      setError(`Generation failed: ${err.message}`);
      setIsGenerating(false);
    }
  };

  const handleClearSession = () => {
    localStorage.removeItem('po_shop_domain');
    setSessionSaved(false);
    setSessionBrowserReady(false);
    setShopDomain('');
    setSuccess('Session cleared');
    setTimeout(() => setSuccess(''), 2000);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <Stack vertical spacing="loose">
        {/* Header */}
        <div>
          <h1 style={{ marginBottom: '8px' }}>🛒 Shopify PO Seeder</h1>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Automatically generate realistic purchase orders in your Shopify admin using Playwright
          </p>
        </div>

        {/* Notifications */}
        {error && (
          <Banner status="critical" onDismiss={() => setError('')}>
            <p>{error}</p>
          </Banner>
        )}
        {success && (
          <Banner status="success" onDismiss={() => setSuccess('')}>
            <p>{success}</p>
          </Banner>
        )}

        {/* Step 1: Create Session */}
        <Card title="Step 1: Connect Store" sectioned>
          <Stack vertical spacing="medium">
            {!sessionSaved ? (
              <>
                <p style={{ fontSize: '14px', color: '#666' }}>
                  Enter your Shopify store domain to create a browser session. You'll be guided through
                  the Shopify login process.
                </p>
                <FormLayout>
                  <TextField
                    label="Shop Domain"
                    placeholder="yourstore.myshopify.com"
                    value={shopDomain}
                    onChange={setShopDomain}
                    disabled={loadingSession}
                    helpText="Format: yourstore.myshopify.com"
                  />
                  <Button
                    primary
                    onClick={handleCreateSession}
                    loading={loadingSession}
                    disabled={!shopDomain.trim() || loadingSession}
                  >
                    {loadingSession ? 'Connecting...' : 'Connect & Create Session'}
                  </Button>
                </FormLayout>
              </>
            ) : (
              <div style={{ padding: '16px', backgroundColor: '#f0f7f4', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontWeight: '600' }}>✅ Session Active</p>
                    <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>{shopDomain}</p>
                  </div>
                  <Button
                    outline
                    destructive
                    onClick={handleClearSession}
                    disabled={isGenerating}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </Stack>
        </Card>

        {/* Step 2: Generate POs */}
        {sessionSaved && (
          <Card title="Step 2: Generate Purchase Orders" sectioned>
            <Stack vertical spacing="medium">
              {!isGenerating ? (
                <>
                  <FormLayout>
                    <TextField
                      label="Number of POs to Generate"
                      type="number"
                      value={poCount}
                      onChange={setPoCount}
                      placeholder="50"
                      min="1"
                      max="5000"
                      disabled={isGenerating}
                      helpText="Generate 1-5000 POs. Each PO has random suppliers and products."
                    />
                  </FormLayout>
                  <Button
                    primary
                    size="large"
                    onClick={handleGeneratePOs}
                    loading={isGenerating}
                    disabled={!sessionSaved || isGenerating}
                  >
                    🚀 Start Generating
                  </Button>
                </>
              ) : (
                <div>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '600' }}>Generating POs...</span>
                      <Badge>{completedPOs} / {totalPOs}</Badge>
                    </div>
                    <ProgressBar progress={progress} size="medium" />
                  </div>
                  <p style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
                    This may take several minutes. Do not close this window.
                  </p>
                </div>
              )}
            </Stack>
          </Card>
        )}

        {/* Info Section */}
        <Card title="How It Works" sectioned>
          <TextContainer>
            <ul style={{ fontSize: '14px', color: '#666', marginLeft: '20px' }}>
              <li><strong>Step 1:</strong> Connect your Shopify store domain to create an authenticated browser session</li>
              <li><strong>Step 2:</strong> Specify how many POs you want to generate (1-5000)</li>
              <li><strong>Step 3:</strong> The app uses Playwright to automate PO creation with realistic data</li>
              <li><strong>Real Data:</strong> Each PO includes random suppliers, products, and quantities</li>
              <li><strong>Progress Tracking:</strong> Watch real-time progress as POs are created</li>
            </ul>
          </TextContainer>
        </Card>

        {/* Features */}
        <Card title="Features" sectioned>
          <Stack>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: '600', marginBottom: '4px' }}>✅ Reliable Selectors</p>
              <p style={{ fontSize: '13px', color: '#666', margin: '0' }}>Uses Shopify's stable selectors (getByRole)</p>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: '600', marginBottom: '4px' }}>🔄 Auto-Retry Logic</p>
              <p style={{ fontSize: '13px', color: '#666', margin: '0' }}>Handles UI changes gracefully</p>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: '600', marginBottom: '4px' }}>📊 Real-Time Progress</p>
              <p style={{ fontSize: '13px', color: '#666', margin: '0' }}>Live updates as POs generate</p>
            </div>
          </Stack>
        </Card>
      </Stack>
    </div>
  );
};

export default POSeederApp;
