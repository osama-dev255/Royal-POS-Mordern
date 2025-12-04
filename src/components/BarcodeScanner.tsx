import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  QrCode, 
  Camera, 
  Scan, 
  ShoppingCart,
  Plus,
  Minus,
  X,
  Image as ImageIcon,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
// Import Quagga for barcode scanning
import Quagga from 'quagga';
// Import the database service to fetch real products
import { getProductByBarcode } from "@/services/databaseService";

interface ScannedItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  barcode: string;
}

interface BarcodeScannerProps {
  onItemsScanned: (items: ScannedItem[]) => void;
  onCancel: () => void;
  autoAddToCart?: boolean; // New prop for auto-adding to cart
}

export const BarcodeScanner = ({ onItemsScanned, onCancel, autoAddToCart = false }: BarcodeScannerProps) => {
  const { toast } = useToast();
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [manualBarcode, setManualBarcode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<number>(0); // Track last scan time
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const quaggaInitialized = useRef(false);

  // Initialize camera for scanning with better mobile support
  useEffect(() => {
    const initCamera = async () => {
      try {
        console.log("Attempting to access camera...");
        
        // Check if mediaDevices is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera API not supported in this browser. Please try a modern browser like Chrome, Firefox, or Safari.");
        }
        
        // Try different constraints as fallbacks
        const constraintsOptions = [
          { video: { facingMode: { exact: "environment" } } }, // Prefer back camera
          { video: { facingMode: "environment" } },
          { video: { facingMode: "user" } }, // Fallback to front camera
          { video: { width: { ideal: 1280 }, height: { ideal: 720 } } },
          { video: true }
        ];
        
        let stream;
        let error;
        let usedConstraints = {};
        
        for (const constraints of constraintsOptions) {
          try {
            console.log("Trying constraints:", constraints);
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            usedConstraints = constraints;
            console.log("Camera access granted with constraints:", constraints);
            break;
          } catch (err) {
            error = err;
            console.warn("Failed with constraints:", constraints, err);
          }
        }
        
        if (!stream && error) {
          throw new Error(`Failed to access camera. Please ensure you've granted camera permissions. Error: ${error.message || error}`);
        }
        
        console.log("Using camera constraints:", usedConstraints);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          
          // Play the video explicitly for mobile browsers
          try {
            await videoRef.current.play();
            console.log("Video playback started");
          } catch (playError) {
            console.warn("Video play failed:", playError);
            // This might happen on mobile browsers that require user interaction
          }
        }
        setIsScanning(true);
      } catch (err) {
        console.error("Error accessing camera:", err);
        toast({
          title: "Camera Access Denied",
          description: err.message || "Please enable camera access to use the scanner",
          variant: "success",
        });
      }
    };

    if (isScanning) {
      initCamera();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      // Stop Quagga when component unmounts
      if (quaggaInitialized.current) {
        Quagga.stop();
        quaggaInitialized.current = false;
      }
    };
  }, [isScanning, toast]);

  // Initialize barcode detection (using modern Barcode Detection API if available, fallback to Quagga)
  useEffect(() => {
    if (isScanning && videoRef.current) {
      // Check if Barcode Detection API is available (Chrome only for now)
      if ('BarcodeDetector' in window) {
        console.log("Using modern Barcode Detection API");
        initModernBarcodeDetection();
      } else {
        console.log("Using Quagga.js for barcode detection");
        initQuaggaBarcodeDetection();
      }
    }

    return () => {
      // Clean up both detection methods
      if (quaggaInitialized.current) {
        Quagga.stop();
        quaggaInitialized.current = false;
      }
      
      // Stop modern detection if running
      if (barcodeDetectionInterval.current) {
        clearInterval(barcodeDetectionInterval.current);
        barcodeDetectionInterval.current = null;
      }
    };
  }, [isScanning]);

  // Reference for modern barcode detection interval
  const barcodeDetectionInterval = useRef<NodeJS.Timeout | null>(null);
  const barcodeDetectorRef = useRef<any>(null);

  // Initialize modern barcode detection (Chrome only) with improved responsiveness
  const initModernBarcodeDetection = async () => {
    try {
      // @ts-ignore - BarcodeDetector is not in TypeScript definitions yet
      barcodeDetectorRef.current = new BarcodeDetector({
        formats: ['code_128', 'ean_13', 'ean_8', 'code_39', 'code_93', 'codabar', 'upc_a', 'upc_e', 'qr_code']
      });
      
      console.log("Modern Barcode Detection API initialized");
      
      // Start detection loop with improved responsiveness
      let lastDetectionTime = 0;
      
      const detectBarcodes = async () => {
        if (videoRef.current && barcodeDetectorRef.current) {
          try {
            const barcodes = await barcodeDetectorRef.current.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              console.log("Barcodes detected:", barcodes);
              
              // Process the first detected barcode
              const barcode = barcodes[0].rawValue;
              if (barcode) {
                console.log("Scanned barcode:", barcode);
                
                // Debounce scanning to prevent multiple detections
                const now = Date.now();
                if (now - lastDetectionTime > 1000) { // At least 1 second between scans
                  lastDetectionTime = now;
                  simulateScan(barcode);
                  
                  // Add visual feedback for successful scan
                  if (videoRef.current) {
                    // Flash effect on successful scan
                    const flashEffect = document.createElement('div');
                    flashEffect.style.position = 'absolute';
                    flashEffect.style.top = '0';
                    flashEffect.style.left = '0';
                    flashEffect.style.width = '100%';
                    flashEffect.style.height = '100%';
                    flashEffect.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                    flashEffect.style.pointerEvents = 'none';
                    flashEffect.style.zIndex = '10';
                    flashEffect.style.animation = 'flash 0.3s';
                    
                    // Add CSS for flash animation
                    const style = document.createElement('style');
                    style.innerHTML = `
                      @keyframes flash {
                        0% { opacity: 1; }
                        100% { opacity: 0; }
                      }
                    `;
                    document.head.appendChild(style);
                    
                    videoRef.current.parentElement?.appendChild(flashEffect);
                    setTimeout(() => {
                      flashEffect.remove();
                      style.remove();
                    }, 300);
                  }
                }
              }
            }
          } catch (err) {
            console.error("Error detecting barcodes:", err);
          }
        }
      };
      
      // Run detection more frequently for better responsiveness
      barcodeDetectionInterval.current = setInterval(detectBarcodes, 300);
    } catch (err) {
      console.error("Error initializing Barcode Detection API:", err);
      // Fallback to Quagga
      initQuaggaBarcodeDetection();
    }
  };

  // Initialize Quagga for barcode scanning (fallback) with improved responsiveness
  const initQuaggaBarcodeDetection = () => {
    if (quaggaInitialized.current) return;

    console.log("Initializing Quagga...");
    
    // Check if video element is ready
    if (!videoRef.current || videoRef.current.videoWidth === 0) {
      console.warn("Video element not ready, waiting...");
      setTimeout(initQuaggaBarcodeDetection, 500);
      return;
    }
    
    const config = {
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: videoRef.current,
        constraints: {
          width: { min: 640 },
          height: { min: 480 },
          facingMode: "environment"
        },
      },
      locator: {
        patchSize: "medium",
        halfSample: true
      },
      numOfWorkers: navigator.hardwareConcurrency ? navigator.hardwareConcurrency - 1 : 2,
      decoder: {
        readers: [
          "code_128_reader",
          "ean_reader",
          "ean_8_reader",
          "code_39_reader",
          "code_39_vin_reader",
          "codabar_reader",
          "upc_reader",
          "upc_e_reader",
          "i2of5_reader"
        ]
      },
      locate: true
    };
    
    console.log("Quagga config:", config);
    
    Quagga.init(config, (err) => {
      if (err) {
        console.error("Error initializing Quagga:", err);
        toast({
          title: "Scanner Error",
          description: "Failed to initialize barcode scanner: " + (err.message || "Unknown error"),
          variant: "success",
        });
        return;
      }
      
      console.log("Quagga initialized successfully");
      
      // Check if camera is actually providing frames
      if (videoRef.current && videoRef.current.srcObject) {
        Quagga.start();
        quaggaInitialized.current = true;
        
        // Set up detection callback with improved responsiveness
        let lastDetectionTime = 0;
        
        Quagga.onDetected((data) => {
          console.log("Barcode detected:", data);
          if (data && data.codeResult && data.codeResult.code) {
            const barcode = data.codeResult.code;
            console.log("Scanned barcode:", barcode);
            
            // Debounce scanning to prevent multiple detections of the same barcode
            const now = Date.now();
            if (now - lastDetectionTime > 1000) { // At least 1 second between scans
              lastDetectionTime = now;
              simulateScan(barcode);
              
              // Add visual feedback for successful scan
              if (videoRef.current) {
                // Flash effect on successful scan
                const flashEffect = document.createElement('div');
                flashEffect.style.position = 'absolute';
                flashEffect.style.top = '0';
                flashEffect.style.left = '0';
                flashEffect.style.width = '100%';
                flashEffect.style.height = '100%';
                flashEffect.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                flashEffect.style.pointerEvents = 'none';
                flashEffect.style.zIndex = '10';
                flashEffect.style.animation = 'flash 0.3s';
                
                // Add CSS for flash animation
                const style = document.createElement('style');
                style.innerHTML = `
                  @keyframes flash {
                    0% { opacity: 1; }
                    100% { opacity: 0; }
                  }
                `;
                document.head.appendChild(style);
                
                videoRef.current.parentElement?.appendChild(flashEffect);
                setTimeout(() => {
                  flashEffect.remove();
                  style.remove();
                }, 300);
              }
            }
          }
        });
      } else {
        console.error("Camera stream not available");
        toast({
          title: "Scanner Error",
          description: "Camera stream not available",
          variant: "success",
        });
      }
    });
  };

  // Updated simulateScan function with improved responsiveness
  const simulateScan = async (barcode: string) => {
    // Prevent too frequent scanning (debounce)
    const now = Date.now();
    if (now - lastScanTime < 300) {
      return; // Ignore if scanned too quickly
    }
    setLastScanTime(now);
    
    try {
      // Show immediate feedback that scanning is happening
      toast({
        title: "Scanning...",
        description: `Looking up product with barcode ${barcode}`,
      });
      
      // Fetch product from Supabase database
      const product = await getProductByBarcode(barcode);
      
      if (product) {
        // Check if item already exists in cart
        const existingItemIndex = scannedItems.findIndex(item => item.barcode === barcode);
        
        let updatedItems = [...scannedItems];
        
        if (existingItemIndex >= 0) {
          // Update quantity if item already exists
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: updatedItems[existingItemIndex].quantity + 1
          };
          setScannedItems(updatedItems);
        } else {
          // Add new item
          const newItem: ScannedItem = {
            id: product.id || "",
            name: product.name,
            price: product.selling_price,
            quantity: 1,
            barcode: product.barcode || ""
          };
          updatedItems = [...scannedItems, newItem];
          setScannedItems(updatedItems);
        }
        
        // Show success message
        toast({
          title: "Item Scanned",
          description: `${product.name} added to cart`,
        });
        
        // If autoAddToCart is enabled, automatically add to the main cart
        if (autoAddToCart) {
          setTimeout(() => {
            onItemsScanned([{
              id: product.id || "",
              name: product.name,
              price: product.selling_price,
              quantity: 1,
              barcode: product.barcode || ""
            }]);
            
            // Clear scanned items after auto-adding
            setScannedItems([]);
          }, 500); // Small delay to show the success message first
        }
      } else {
        toast({
          title: "Product Not Found",
          description: `No product found with barcode ${barcode}`,
          variant: "success",
        });
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      toast({
        title: "Error",
        description: "Failed to fetch product information",
        variant: "success",
      });
    }
  };

  // Updated handleManualEntry function to use real database
  const handleManualEntry = async () => {
    if (manualBarcode.trim()) {
      await simulateScan(manualBarcode.trim());
      setManualBarcode("");
    }
  };

  // Handle quantity changes
  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setScannedItems(scannedItems.filter(item => item.id !== id));
      return;
    }
    
    setScannedItems(
      scannedItems.map(item => 
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  // Remove item from cart
  const removeItem = (id: string) => {
    setScannedItems(scannedItems.filter(item => item.id !== id));
  };

  // Calculate total
  const calculateTotal = () => {
    return scannedItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Updated handleScanComplete function for better sales experience
  const handleScanComplete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (scannedItems.length > 0) {
      onItemsScanned(scannedItems);
      // Clear scanned items after adding to cart
      setScannedItems([]);
      
      toast({
        title: "Items Added",
        description: `${scannedItems.length} item(s) added to cart`,
      });
    } else {
      toast({
        title: "No Items Scanned",
        description: "Please scan at least one item before proceeding",
        variant: "success",
      });
    }
  };

  // Add a function to manually trigger scanning initialization
  const retryCameraAccess = async () => {
    // Stop any existing streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Reset states
    setIsScanning(false);
    quaggaInitialized.current = false;
    
    // Stop modern detection if running
    if (barcodeDetectionInterval.current) {
      clearInterval(barcodeDetectionInterval.current);
      barcodeDetectionInterval.current = null;
    }
    
    // Wait a bit for cleanup
    setTimeout(() => {
      setIsScanning(true);
    }, 100);
  };

  // Function to handle photo upload for barcode scanning
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    toast({
      title: "Feature Not Available",
      description: "Photo upload scanning is not currently supported. Please use the live camera scanner instead.",
    });
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Function to trigger file input
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Check if we're on a mobile device
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Function to check if we're in a secure context (HTTPS or localhost)
  const isSecureContext = window.isSecureContext;

  // Add function to clear scanned items
  const clearScannedItems = () => {
    setScannedItems([]);
  };

  // Simulate scanning some sample barcodes for demo purposes
  const addSampleItems = () => {
    simulateScan("123456789012"); // Wireless Headphones
    simulateScan("234567890123"); // Coffee Maker
    simulateScan("456789012345"); // Smartphone Case
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center">
            <Scan className="mr-2 h-6 w-6" />
            Barcode Scanner
          </h2>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={clearScannedItems}
              disabled={scannedItems.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button 
              variant="outline" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCancel();
              }}
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        </div>

        {isMobile && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <h3 className="font-medium text-yellow-800">Mobile Device Detected</h3>
            <p className="text-sm text-yellow-700 mt-1">
              For best scanning experience on mobile:
            </p>
            <ul className="text-xs text-yellow-700 mt-1 list-disc pl-5 space-y-1">
              <li>Ensure you're using the latest version of Chrome, Safari, or Firefox</li>
              <li>Make sure you're accessing the app over HTTPS (not HTTP)</li>
              <li>Grant camera permissions when prompted</li>
              <li>Hold the device steady and ensure good lighting</li>
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scanner Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Camera className="mr-2 h-5 w-5" />
                  Scan Items
                </div>
                {scannedItems.length > 0 && (
                  <Badge variant="secondary">{scannedItems.length} items</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Camera Preview */}
                <div className="relative bg-muted rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                  {isScanning ? (
                    <>
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="border-2 border-primary rounded-lg w-64 h-48 animate-pulse"></div>
                      </div>
                      <div className="absolute bottom-4 left-0 right-0 text-center text-white bg-black bg-opacity-50 py-2">
                        Point camera at barcode
                      </div>
                      {scannedItems.length > 0 && (
                        <div className="absolute top-4 right-4 bg-green-500 text-white px-2 py-1 rounded-md text-sm">
                          {scannedItems.length} scanned
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center p-8">
                      <QrCode className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      {!isSecureContext ? (
                        <>
                          <p className="text-muted-foreground mb-4">
                            Camera access requires a secure connection (HTTPS)
                          </p>
                          <p className="text-sm text-muted-foreground mb-4">
                            For mobile devices, please ensure you're accessing this app through a secure connection.
                          </p>
                        </>
                      ) : isMobile ? (
                        <>
                          <p className="text-muted-foreground mb-4">
                            Camera access required for scanning
                          </p>
                          <p className="text-sm text-muted-foreground mb-4">
                            On mobile devices, you may need to tap the button below and then allow camera access when prompted.
                          </p>
                        </>
                      ) : (
                        <p className="text-muted-foreground mb-4">
                          Camera access required for scanning
                        </p>
                      )}
                      <div className="flex flex-col gap-2">
                        <Button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            retryCameraAccess();
                          }}
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          {isMobile ? "Request Camera Access" : "Enable Camera"}
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            triggerFileInput();
                          }}
                        >
                          <ImageIcon className="mr-2 h-4 w-4" />
                          Upload Photo
                        </Button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                        />
                      </div>
                      {!isSecureContext && (
                        <p className="text-xs text-muted-foreground mt-4">
                          Note: Barcode scanning requires HTTPS connection on mobile devices.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Manual Entry */}
                <div className="space-y-2">
                  <Label htmlFor="manual-barcode">Or enter barcode manually</Label>
                  <div className="flex gap-2">
                    <Input
                      id="manual-barcode"
                      placeholder="Enter barcode number"
                      value={manualBarcode}
                      onChange={(e) => setManualBarcode(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleManualEntry();
                        }
                      }}
                    />
                    <Button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleManualEntry();
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button 
                    variant="secondary" 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      addSampleItems();
                    }}
                    className="flex-1"
                  >
                    Add Sample Items (Demo)
                  </Button>
                  {autoAddToCart ? null : (
                    <Button 
                      onClick={handleScanComplete}
                      disabled={scannedItems.length === 0}
                      className="flex-1"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cart Section - Only show if not auto-adding to cart */}
          {!autoAddToCart && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Scanned Items
                  </div>
                  {scannedItems.length > 0 && (
                    <Badge className="ml-2">{scannedItems.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {scannedItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="mx-auto h-12 w-12 mb-4" />
                    <p>No items scanned yet</p>
                    <p className="text-sm mt-2">Scan items or enter barcodes manually</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="max-h-96 overflow-y-auto pr-2">
                      {scannedItems.map((item) => (
                        <div 
                          key={item.id} 
                          className="flex items-center justify-between p-3 border rounded-lg mb-2 hover:bg-muted transition-colors"
                        >
                          <div className="flex-1">
                            <h3 className="font-medium">{item.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(item.price)} × {item.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                updateQuantity(item.id, item.quantity - 1);
                              }}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                updateQuantity(item.id, item.quantity + 1);
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                removeItem(item.id);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span>{formatCurrency(calculateTotal())}</span>
                      </div>
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={handleScanComplete}
                      disabled={scannedItems.length === 0}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add All to Cart
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};