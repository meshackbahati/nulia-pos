import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PAPER_SIZES } from '@/config/barcode-print';

interface BarcodeSettingsProps {
  settings: {
    paperSize: typeof PAPER_SIZES[0];
    customWidth: number;
    customHeight: number;
    copiesPerPage: number;
    showPrice: boolean;
    showName: boolean;
  };
  onSettingsChange: (settings: any) => void;
  onClose: () => void;
}

export function BarcodeSettings({ settings, onSettingsChange, onClose }: BarcodeSettingsProps) {
  const updatePaperSize = (id: string) => {
    const size = PAPER_SIZES.find(s => s.id === id) || PAPER_SIZES[0];
    onSettingsChange({
      paperSize: size,
      customWidth: size.width || settings.customWidth,
      customHeight: size.height || settings.customHeight
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-50">
      <div className="bg-white h-full w-full max-w-md p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Print Settings</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <Label>Paper Size</Label>
            <Select value={settings.paperSize.id} onValueChange={updatePaperSize}>
              <SelectTrigger>
                <SelectValue placeholder="Select paper size" />
              </SelectTrigger>
              <SelectContent>
                {PAPER_SIZES.map(size => (
                  <SelectItem key={size.id} value={size.id}>
                    {size.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {settings.paperSize.id === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Width (mm)</Label>
                <Input 
                  type="number" 
                  value={settings.customWidth}
                  onChange={(e) => onSettingsChange({ customWidth: Number(e.target.value) || 50 })}
                />
              </div>
              <div>
                <Label>Height (mm)</Label>
                <Input 
                  type="number" 
                  value={settings.customHeight}
                  onChange={(e) => onSettingsChange({ customHeight: Number(e.target.value) || 30 })}
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Copies per Label</Label>
              <span className="text-sm font-medium">{settings.copiesPerPage}</span>
            </div>
            <Slider
              min={1}
              max={10}
              step={1}
              value={[settings.copiesPerPage]}
              onValueChange={([value]) => onSettingsChange({ copiesPerPage: value || 1 })}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showName"
                checked={settings.showName}
                onChange={(e) => onSettingsChange({ showName: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <Label htmlFor="showName">Show Product Name</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showPrice"
                checked={settings.showPrice}
                onChange={(e) => onSettingsChange({ showPrice: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <Label htmlFor="showPrice">Show Price</Label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
