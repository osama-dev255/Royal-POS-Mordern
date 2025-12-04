# Custom Receipt Templates Documentation

## Overview
This document explains how to use the custom receipt template feature in the POS system, allowing users to fully customize their receipt printing format.

## Accessing Template Settings

1. Navigate to the **Settings** page in the POS system
2. Click on the **Receipt** tab in the settings navigation
3. Scroll down to the **Custom Receipt Template** section
4. Toggle the **Enable Custom Template** switch to activate the feature

## Template Configuration Options

### Basic Settings
- **Enable Custom Template**: Toggle to enable/disable custom template
- **Receipt Header**: Multi-line text field for the receipt header content
- **Receipt Footer**: Multi-line text field for the receipt footer content
- **Font Size**: Choose from 10px, 12px, 14px, or 16px
- **Paper Width**: Choose from 280px, 320px, 360px, or 400px

### Section Visibility Controls
- **Show Business Info**: Display business name and contact information
- **Show Transaction Details**: Display receipt number, date, and time
- **Show Item Details**: Display purchased items with quantities and prices
- **Show Totals**: Display subtotal, tax, discount, and total amounts
- **Show Payment Info**: Display payment method, amount received, and change

## Template Variables

The following variables can be used in your custom templates:

### Business Information
- Business Name
- Business Address
- Business Phone

### Transaction Information
- Receipt Number
- Date
- Time

### Item Details
- Item Name
- Quantity
- Price
- Total

### Financial Details
- Subtotal
- Tax
- Discount
- Total
- Payment Method
- Amount Received
- Change

## Best Practices

### Header Design
- Keep it concise and professional
- Include essential business contact information
- Use line breaks to separate different pieces of information

### Footer Design
- Include thank you messages
- Add return policy information
- Add promotional messages or website/social media links

### Font Size Considerations
- **10px**: Best for detailed receipts with many items
- **12px**: Standard size for most receipts
- **14px**: Good for visibility in bright environments
- **16px**: Best for elderly customers or low-light environments

### Paper Width Considerations
- **280px**: Narrow receipts, saves paper
- **320px**: Standard width for most receipt printers
- **360px**: Good for receipts with longer item names
- **400px**: Best for detailed receipts with promotional content

## Examples

### Minimalist Template
```
Header: Your Business Name
Footer: Thank you for shopping with us!
Sections: Show only Item Details and Totals
Font Size: 12px
Paper Width: 320px
```

### Detailed Template
```
Header: Your Business Name
123 Main Street
City, State 12345
Phone: (555) 123-4567
Footer: Thank you for your business!
Returns accepted within 30 days
Follow us on social media @yourbusiness
Sections: Show all sections
Font Size: 12px
Paper Width: 360px
```

## Technical Implementation

### Storage
Template configurations are stored in the browser's localStorage for persistence between sessions.

### Rendering
The system generates HTML/CSS for the receipt based on your template configuration and opens it in a new browser window for printing.

### Preview
A live preview feature is available in the Settings page to see how your template will look.

## Troubleshooting

### Template Not Applying
1. Ensure **Enable Custom Template** is toggled on
2. Click **Save Changes** after making modifications
3. Refresh the page if changes don't appear

### Printing Issues
1. Check that your receipt printer is properly connected
2. Verify paper size matches your template width
3. Ensure browser print settings are configured correctly

### Layout Problems
1. Adjust font size for better fit
2. Modify paper width to match your printer
3. Simplify header/footer content if text is being cut off