import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Fingerprint, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface BiometricSupport {
  available: boolean;
  authenticators: string[];
  error?: string;
}

export function BiometricLogin() {
  const [isSetup, setIsSetup] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [biometricSupport, setBiometricSupport] = useState<BiometricSupport>({ available: false, authenticators: [] });
  const { loginMutation } = useAuth();
  const { toast } = useToast();

  // Check biometric availability on component mount
  useState(() => {
    checkBiometricSupport();
  });

  async function checkBiometricSupport() {
    try {
      // Check basic WebAuthn support
      if (!window.PublicKeyCredential || !navigator.credentials) {
        setBiometricSupport({ 
          available: false, 
          authenticators: [],
          error: 'WebAuthn not supported in this browser' 
        });
        return;
      }

      // Comprehensive platform support detection
      const [platformAvailable, conditionalUI] = await Promise.allSettled([
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(),
        PublicKeyCredential.isConditionalMediationAvailable?.() || Promise.resolve(false)
      ]);
      
      const authenticators = [];
      let available = false;

      // Platform authenticator (Touch ID, Face ID, Windows Hello, Android Biometrics)
      if (platformAvailable.status === 'fulfilled' && platformAvailable.value) {
        available = true;
        // Detect specific platform capabilities
        const userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
          authenticators.push('Touch ID / Face ID');
        } else if (userAgent.includes('android')) {
          authenticators.push('Fingerprint / Face Unlock');
        } else if (userAgent.includes('windows')) {
          authenticators.push('Windows Hello');
        } else if (userAgent.includes('mac')) {
          authenticators.push('Touch ID');
        } else {
          authenticators.push('Platform Biometrics');
        }
      }

      // Conditional UI for seamless integration
      if (conditionalUI.status === 'fulfilled' && conditionalUI.value) {
        authenticators.push('Autofill Integration');
      }

      // Fallback check for older browsers
      if (!available && 'credentials' in navigator) {
        try {
          // Test credential creation capability
          await navigator.credentials.create({
            publicKey: {
              challenge: new Uint8Array(32),
              rp: { name: "Test", id: window.location.hostname },
              user: { id: new Uint8Array(16), name: "test", displayName: "Test" },
              pubKeyCredParams: [{ alg: -7, type: "public-key" }],
              timeout: 1000,
              authenticatorSelection: { userVerification: "discouraged" }
            }
          });
        } catch (e: any) {
          if (e.name !== 'AbortError' && e.name !== 'NotAllowedError') {
            available = true;
            authenticators.push('Basic WebAuthn Support');
          }
        }
      }

      setBiometricSupport({ available, authenticators });
    } catch (error) {
      console.warn('Biometric support check failed:', error);
      setBiometricSupport({ 
        available: false, 
        authenticators: [],
        error: 'Unable to determine biometric capabilities' 
      });
    }
  }

  async function setupBiometric() {
    setIsSetup(true);
    
    try {
      // Generate challenge from server
      const challengeResponse = await fetch('/api/auth/biometric/register-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!challengeResponse.ok) {
        throw new Error('Failed to get registration challenge');
      }
      
      const { challenge, user } = await challengeResponse.json();
      
      // Create credential
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(Array.from(atob(challenge.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))),
          rp: {
            name: "WynnrZ Tournament Platform",
            id: window.location.hostname,
          },
          user: {
            id: new TextEncoder().encode(user.id),
            name: user.username,
            displayName: user.name,
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" }, // ES256
            { alg: -257, type: "public-key" }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "preferred", // Changed from "required" for better mobile compatibility
            requireResidentKey: false,
            residentKey: "preferred" // Enhanced for passkey support
          },
          timeout: 60000,
          attestation: "direct"
        }
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to create credential');
      }

      // Send credential to server for storage
      const response = await fetch('/api/auth/biometric/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: credential.id,
          rawId: Array.from(new Uint8Array(credential.rawId)),
          response: {
            attestationObject: Array.from(new Uint8Array((credential.response as AuthenticatorAttestationResponse).attestationObject)),
            clientDataJSON: Array.from(new Uint8Array(credential.response.clientDataJSON)),
          },
          type: credential.type,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register biometric credential');
      }

      toast({
        title: "Biometric login set up!",
        description: "You can now use your fingerprint, face, or device PIN to log in securely.",
      });

    } catch (error: any) {
      console.error('Biometric setup error:', error);
      
      let errorMessage = "Failed to set up biometric login. Please try again.";
      let errorTitle = "Setup failed";

      // Enhanced error handling for better user experience
      if (error.name === 'NotAllowedError') {
        errorTitle = "Permission denied";
        errorMessage = "Please allow biometric authentication when prompted by your device.";
      } else if (error.name === 'NotSupportedError') {
        errorTitle = "Not supported";
        errorMessage = "Biometric authentication is not supported on this device or browser.";
      } else if (error.name === 'SecurityError') {
        errorTitle = "Security error";
        errorMessage = "Unable to create secure credential. Please ensure you're using a secure connection (HTTPS).";
      } else if (error.name === 'AbortError') {
        errorTitle = "Setup cancelled";
        errorMessage = "Biometric setup was cancelled. You can try again anytime.";
      } else if (error.name === 'InvalidStateError') {
        errorTitle = "Already registered";
        errorMessage = "A biometric credential is already registered for this account.";
      } else if (error.name === 'UnknownError') {
        errorTitle = "Device error";
        errorMessage = "There was a problem with your device's biometric sensor. Please try again.";
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSetup(false);
    }
  }

  async function authenticateWithBiometric() {
    setIsAuthenticating(true);

    try {
      // Get authentication challenge
      const challengeResponse = await fetch('/api/auth/biometric/login-challenge', {
        method: 'POST',
      });

      if (!challengeResponse.ok) {
        throw new Error('Failed to get authentication challenge');
      }

      const { challenge, allowCredentials } = await challengeResponse.json();

      // Authenticate with credential
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(Array.from(atob(challenge.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))),
          allowCredentials: allowCredentials.map((cred: any) => ({
            id: new TextEncoder().encode(cred.id),
            type: 'public-key',
          })),
          userVerification: 'preferred', // Better mobile compatibility
          timeout: 60000,
        }
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Authentication was cancelled');
      }

      // Send authentication result to server
      const authResponse = await fetch('/api/auth/biometric/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: credential.id,
          rawId: Array.from(new Uint8Array(credential.rawId)),
          response: {
            authenticatorData: Array.from(new Uint8Array((credential.response as AuthenticatorAssertionResponse).authenticatorData)),
            clientDataJSON: Array.from(new Uint8Array(credential.response.clientDataJSON)),
            signature: Array.from(new Uint8Array((credential.response as AuthenticatorAssertionResponse).signature)),
          },
          type: credential.type,
        }),
      });

      if (!authResponse.ok) {
        throw new Error('Authentication failed');
      }

      const user = await authResponse.json();
      
      // Update auth state
      toast({
        title: "Welcome back!",
        description: "Successfully logged in with biometric authentication.",
      });

    } catch (error: any) {
      console.error('Biometric auth error:', error);
      
      let errorMessage = "Biometric authentication failed. Please try again.";
      let errorTitle = "Authentication failed";

      // Enhanced error handling for authentication
      if (error.name === 'NotAllowedError') {
        errorTitle = "Permission denied";
        errorMessage = "Please allow biometric authentication when prompted by your device.";
      } else if (error.name === 'NotSupportedError') {
        errorTitle = "Not supported";
        errorMessage = "Biometric authentication is not supported on this device or browser.";
      } else if (error.name === 'SecurityError') {
        errorTitle = "Security error";
        errorMessage = "Unable to verify credential. Please ensure you're using a secure connection (HTTPS).";
      } else if (error.name === 'AbortError') {
        errorTitle = "Authentication cancelled";
        errorMessage = "Biometric authentication was cancelled. You can try again anytime.";
      } else if (error.name === 'InvalidStateError') {
        errorTitle = "Credential issue";
        errorMessage = "There's an issue with your saved biometric credential. Please set up biometric login again.";
      } else if (error.name === 'UnknownError') {
        errorTitle = "Device error";
        errorMessage = "There was a problem with your device's biometric sensor. Please try again.";
      } else if (error.name === 'NetworkError') {
        errorTitle = "Connection error";
        errorMessage = "Unable to connect to the server. Please check your internet connection.";
      } else if (error.message === 'Authentication was cancelled') {
        errorTitle = "Authentication cancelled";
        errorMessage = "You cancelled the biometric authentication. Try again when ready.";
      } else if (error.message === 'Authentication failed') {
        errorTitle = "Login failed";
        errorMessage = "The server could not verify your biometric credential. Please try traditional login.";
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAuthenticating(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-full w-fit mb-4">
          <Fingerprint className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-xl font-bold">Biometric Login</CardTitle>
        <CardDescription>
          Secure, convenient authentication using your device's biometric sensors
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!biometricSupport.available ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {biometricSupport.error || 'Biometric authentication is not available on this device or browser.'}
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Biometric authentication is supported on this device!
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Available authenticators:</h4>
              {biometricSupport.authenticators.map((auth, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm text-slate-600">
                  <Shield className="h-3 w-3" />
                  <span>{auth}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-4">
              <Button
                onClick={setupBiometric}
                disabled={isSetup}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                {isSetup ? 'Setting up...' : 'Set Up Biometric Login'}
              </Button>

              <Button
                onClick={authenticateWithBiometric}
                disabled={isAuthenticating}
                variant="outline"
                className="w-full"
              >
                {isAuthenticating ? 'Authenticating...' : 'Login with Biometrics'}
              </Button>
            </div>

            <div className="text-xs text-slate-500 text-center pt-2">
              Your biometric data never leaves your device and is encrypted using industry-standard security protocols.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}