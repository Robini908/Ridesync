import nodemailer from "nodemailer";
import mjml2html from "mjml";
import { prisma } from "@/lib/prisma";
import { SubscriptionService } from "@/lib/subscription";
import { ServiceType } from "@prisma/client";

// Email template types
export type EmailTemplateType = 
  | "booking_confirmation"
  | "payment_success"
  | "trip_reminder"
  | "delay_notification"
  | "cancellation"
  | "welcome"
  | "password_reset"
  | "subscription_upgrade"
  | "subscription_payment_failed";

// Default MJML templates
const DEFAULT_TEMPLATES: Record<EmailTemplateType, { subject: string; mjml: string }> = {
  booking_confirmation: {
    subject: "Booking Confirmed - {{bookingReference}}",
    mjml: `
      <mjml>
        <mj-head>
          <mj-title>Booking Confirmation</mj-title>
          <mj-font name="Inter" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
          <mj-attributes>
            <mj-all font-family="Inter, Arial, sans-serif" />
          </mj-attributes>
        </mj-head>
        <mj-body background-color="{{backgroundColor}}">
          <mj-section background-color="{{primaryColor}}" padding="20px">
            <mj-column>
              {{#if tenantLogo}}
              <mj-image src="{{tenantLogo}}" alt="{{tenantName}}" width="150px" />
              {{else}}
              <mj-text color="white" font-size="24px" font-weight="bold" align="center">{{tenantName}}</mj-text>
              {{/if}}
            </mj-column>
          </mj-section>
          
          <mj-section background-color="white" padding="20px">
            <mj-column>
              <mj-text font-size="20px" font-weight="600" color="{{primaryColor}}">
                Booking Confirmed!
              </mj-text>
              
              <mj-text font-size="16px" color="#333333">
                Hi {{passengerName}},
              </mj-text>
              
              <mj-text font-size="16px" color="#333333">
                Your booking has been confirmed. Here are your trip details:
              </mj-text>
              
              <mj-table>
                <tr style="border-bottom:1px solid #eceeef;text-align:left;padding:15px 0;">
                  <th style="padding: 10px; font-weight: 600;">Booking Reference:</th>
                  <td style="padding: 10px; color: {{primaryColor}}; font-weight: 600;">{{bookingReference}}</td>
                </tr>
                <tr style="border-bottom:1px solid #eceeef;text-align:left;padding:15px 0;">
                  <th style="padding: 10px; font-weight: 600;">From:</th>
                  <td style="padding: 10px;">{{fromCity}}</td>
                </tr>
                <tr style="border-bottom:1px solid #eceeef;text-align:left;padding:15px 0;">
                  <th style="padding: 10px; font-weight: 600;">To:</th>
                  <td style="padding: 10px;">{{toCity}}</td>
                </tr>
                <tr style="border-bottom:1px solid #eceeef;text-align:left;padding:15px 0;">
                  <th style="padding: 10px; font-weight: 600;">Date:</th>
                  <td style="padding: 10px;">{{departureDate}}</td>
                </tr>
                <tr style="border-bottom:1px solid #eceeef;text-align:left;padding:15px 0;">
                  <th style="padding: 10px; font-weight: 600;">Time:</th>
                  <td style="padding: 10px;">{{departureTime}}</td>
                </tr>
                <tr style="border-bottom:1px solid #eceeef;text-align:left;padding:15px 0;">
                  <th style="padding: 10px; font-weight: 600;">Seats:</th>
                  <td style="padding: 10px;">{{seatCount}} ({{seatNumbers}})</td>
                </tr>
                <tr style="text-align:left;padding:15px 0;">
                  <th style="padding: 10px; font-weight: 600;">Total:</th>
                  <td style="padding: 10px; color: {{primaryColor}}; font-weight: 600;">{{totalAmount}}</td>
                </tr>
              </mj-table>
              
              <mj-button background-color="{{primaryColor}}" color="white" href="{{viewBookingUrl}}">
                View Booking Details
              </mj-button>
              
              <mj-text font-size="14px" color="#666666">
                If you have any questions, please contact our support team.
              </mj-text>
            </mj-column>
          </mj-section>
          
          <mj-section background-color="#f8f9fa" padding="20px">
            <mj-column>
              <mj-text font-size="12px" color="#666666" align="center">
                © {{currentYear}} {{tenantName}}. All rights reserved.
              </mj-text>
              {{#unless whiteLabel}}
              <mj-text font-size="12px" color="#999999" align="center">
                Powered by RideWave
              </mj-text>
              {{/unless}}
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>
    `,
  },
  payment_success: {
    subject: "Payment Received - {{bookingReference}}",
    mjml: `
      <mjml>
        <mj-head>
          <mj-title>Payment Confirmation</mj-title>
          <mj-font name="Inter" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
          <mj-attributes>
            <mj-all font-family="Inter, Arial, sans-serif" />
          </mj-attributes>
        </mj-head>
        <mj-body background-color="{{backgroundColor}}">
          <mj-section background-color="{{primaryColor}}" padding="20px">
            <mj-column>
              {{#if tenantLogo}}
              <mj-image src="{{tenantLogo}}" alt="{{tenantName}}" width="150px" />
              {{else}}
              <mj-text color="white" font-size="24px" font-weight="bold" align="center">{{tenantName}}</mj-text>
              {{/if}}
            </mj-column>
          </mj-section>
          
          <mj-section background-color="white" padding="20px">
            <mj-column>
              <mj-text font-size="20px" font-weight="600" color="{{primaryColor}}">
                Payment Received!
              </mj-text>
              
              <mj-text font-size="16px" color="#333333">
                Hi {{passengerName}},
              </mj-text>
              
              <mj-text font-size="16px" color="#333333">
                We've successfully received your payment for booking {{bookingReference}}.
              </mj-text>
              
              <mj-table>
                <tr style="border-bottom:1px solid #eceeef;text-align:left;padding:15px 0;">
                  <th style="padding: 10px; font-weight: 600;">Amount Paid:</th>
                  <td style="padding: 10px; color: {{primaryColor}}; font-weight: 600;">{{paidAmount}}</td>
                </tr>
                <tr style="border-bottom:1px solid #eceeef;text-align:left;padding:15px 0;">
                  <th style="padding: 10px; font-weight: 600;">Payment Method:</th>
                  <td style="padding: 10px;">{{paymentMethod}}</td>
                </tr>
                <tr style="text-align:left;padding:15px 0;">
                  <th style="padding: 10px; font-weight: 600;">Transaction ID:</th>
                  <td style="padding: 10px;">{{transactionId}}</td>
                </tr>
              </mj-table>
              
              <mj-button background-color="{{primaryColor}}" color="white" href="{{receiptUrl}}">
                Download Receipt
              </mj-button>
            </mj-column>
          </mj-section>
          
          <mj-section background-color="#f8f9fa" padding="20px">
            <mj-column>
              <mj-text font-size="12px" color="#666666" align="center">
                © {{currentYear}} {{tenantName}}. All rights reserved.
              </mj-text>
              {{#unless whiteLabel}}
              <mj-text font-size="12px" color="#999999" align="center">
                Powered by RideWave
              </mj-text>
              {{/unless}}
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>
    `,
  },
  trip_reminder: {
    subject: "Trip Reminder - Departing {{departureTime}}",
    mjml: `
      <mjml>
        <mj-head>
          <mj-title>Trip Reminder</mj-title>
          <mj-font name="Inter" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
          <mj-attributes>
            <mj-all font-family="Inter, Arial, sans-serif" />
          </mj-attributes>
        </mj-head>
        <mj-body background-color="{{backgroundColor}}">
          <mj-section background-color="{{primaryColor}}" padding="20px">
            <mj-column>
              {{#if tenantLogo}}
              <mj-image src="{{tenantLogo}}" alt="{{tenantName}}" width="150px" />
              {{else}}
              <mj-text color="white" font-size="24px" font-weight="bold" align="center">{{tenantName}}</mj-text>
              {{/if}}
            </mj-column>
          </mj-section>
          
          <mj-section background-color="white" padding="20px">
            <mj-column>
              <mj-text font-size="20px" font-weight="600" color="{{primaryColor}}">
                Trip Reminder
              </mj-text>
              
              <mj-text font-size="16px" color="#333333">
                Hi {{passengerName}},
              </mj-text>
              
              <mj-text font-size="16px" color="#333333">
                This is a friendly reminder that your trip is scheduled for {{departureDate}} at {{departureTime}}.
              </mj-text>
              
              <mj-text font-size="16px" color="#333333">
                Please arrive at the departure location at least 15 minutes before departure time.
              </mj-text>
              
              <mj-button background-color="{{primaryColor}}" color="white" href="{{trackingUrl}}">
                Track Your Trip
              </mj-button>
            </mj-column>
          </mj-section>
          
          <mj-section background-color="#f8f9fa" padding="20px">
            <mj-column>
              <mj-text font-size="12px" color="#666666" align="center">
                © {{currentYear}} {{tenantName}}. All rights reserved.
              </mj-text>
              {{#unless whiteLabel}}
              <mj-text font-size="12px" color="#999999" align="center">
                Powered by RideWave
              </mj-text>
              {{/unless}}
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>
    `,
  },
  delay_notification: {
    subject: "Trip Delay - {{bookingReference}}",
    mjml: `
      <mjml>
        <mj-head>
          <mj-title>Trip Delay Notification</mj-title>
          <mj-font name="Inter" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
          <mj-attributes>
            <mj-all font-family="Inter, Arial, sans-serif" />
          </mj-attributes>
        </mj-head>
        <mj-body background-color="{{backgroundColor}}">
          <mj-section background-color="#f59e0b" padding="20px">
            <mj-column>
              {{#if tenantLogo}}
              <mj-image src="{{tenantLogo}}" alt="{{tenantName}}" width="150px" />
              {{else}}
              <mj-text color="white" font-size="24px" font-weight="bold" align="center">{{tenantName}}</mj-text>
              {{/if}}
            </mj-column>
          </mj-section>
          
          <mj-section background-color="white" padding="20px">
            <mj-column>
              <mj-text font-size="20px" font-weight="600" color="#f59e0b">
                Trip Delay Notice
              </mj-text>
              
              <mj-text font-size="16px" color="#333333">
                Hi {{passengerName}},
              </mj-text>
              
              <mj-text font-size="16px" color="#333333">
                We regret to inform you that your trip ({{bookingReference}}) has been delayed by {{delayMinutes}} minutes.
              </mj-text>
              
              <mj-text font-size="16px" color="#333333">
                New departure time: {{newDepartureTime}}
              </mj-text>
              
              {{#if delayReason}}
              <mj-text font-size="16px" color="#333333">
                Reason: {{delayReason}}
              </mj-text>
              {{/if}}
              
              <mj-text font-size="16px" color="#333333">
                We apologize for any inconvenience caused.
              </mj-text>
            </mj-column>
          </mj-section>
          
          <mj-section background-color="#f8f9fa" padding="20px">
            <mj-column>
              <mj-text font-size="12px" color="#666666" align="center">
                © {{currentYear}} {{tenantName}}. All rights reserved.
              </mj-text>
              {{#unless whiteLabel}}
              <mj-text font-size="12px" color="#999999" align="center">
                Powered by RideWave
              </mj-text>
              {{/unless}}
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>
    `,
  },
  cancellation: {
    subject: "Booking Cancelled - {{bookingReference}}",
    mjml: `
      <mjml>
        <mj-head>
          <mj-title>Booking Cancellation</mj-title>
          <mj-font name="Inter" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
          <mj-attributes>
            <mj-all font-family="Inter, Arial, sans-serif" />
          </mj-attributes>
        </mj-head>
        <mj-body background-color="{{backgroundColor}}">
          <mj-section background-color="#ef4444" padding="20px">
            <mj-column>
              {{#if tenantLogo}}
              <mj-image src="{{tenantLogo}}" alt="{{tenantName}}" width="150px" />
              {{else}}
              <mj-text color="white" font-size="24px" font-weight="bold" align="center">{{tenantName}}</mj-text>
              {{/if}}
            </mj-column>
          </mj-section>
          
          <mj-section background-color="white" padding="20px">
            <mj-column>
              <mj-text font-size="20px" font-weight="600" color="#ef4444">
                Booking Cancelled
              </mj-text>
              
              <mj-text font-size="16px" color="#333333">
                Hi {{passengerName}},
              </mj-text>
              
              <mj-text font-size="16px" color="#333333">
                Your booking {{bookingReference}} has been cancelled.
              </mj-text>
              
              {{#if refundAmount}}
              <mj-text font-size="16px" color="#333333">
                A refund of {{refundAmount}} will be processed within 3-5 business days.
              </mj-text>
              {{/if}}
              
              {{#if cancellationReason}}
              <mj-text font-size="16px" color="#333333">
                Reason: {{cancellationReason}}
              </mj-text>
              {{/if}}
            </mj-column>
          </mj-section>
          
          <mj-section background-color="#f8f9fa" padding="20px">
            <mj-column>
              <mj-text font-size="12px" color="#666666" align="center">
                © {{currentYear}} {{tenantName}}. All rights reserved.
              </mj-text>
              {{#unless whiteLabel}}
              <mj-text font-size="12px" color="#999999" align="center">
                Powered by RideWave
              </mj-text>
              {{/unless}}
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>
    `,
  },
  welcome: {
    subject: "Welcome to {{tenantName}}!",
    mjml: `
      <mjml>
        <mj-head>
          <mj-title>Welcome</mj-title>
          <mj-font name="Inter" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
          <mj-attributes>
            <mj-all font-family="Inter, Arial, sans-serif" />
          </mj-attributes>
        </mj-head>
        <mj-body background-color="{{backgroundColor}}">
          <mj-section background-color="{{primaryColor}}" padding="20px">
            <mj-column>
              {{#if tenantLogo}}
              <mj-image src="{{tenantLogo}}" alt="{{tenantName}}" width="150px" />
              {{else}}
              <mj-text color="white" font-size="24px" font-weight="bold" align="center">{{tenantName}}</mj-text>
              {{/if}}
            </mj-column>
          </mj-section>
          
          <mj-section background-color="white" padding="20px">
            <mj-column>
              <mj-text font-size="20px" font-weight="600" color="{{primaryColor}}">
                Welcome aboard!
              </mj-text>
              
              <mj-text font-size="16px" color="#333333">
                Hi {{firstName}},
              </mj-text>
              
              <mj-text font-size="16px" color="#333333">
                Welcome to {{tenantName}}! We're excited to have you join our travel community.
              </mj-text>
              
              <mj-text font-size="16px" color="#333333">
                Start booking your trips today and enjoy convenient, comfortable travel.
              </mj-text>
              
              <mj-button background-color="{{primaryColor}}" color="white" href="{{dashboardUrl}}">
                Get Started
              </mj-button>
            </mj-column>
          </mj-section>
          
          <mj-section background-color="#f8f9fa" padding="20px">
            <mj-column>
              <mj-text font-size="12px" color="#666666" align="center">
                © {{currentYear}} {{tenantName}}. All rights reserved.
              </mj-text>
              {{#unless whiteLabel}}
              <mj-text font-size="12px" color="#999999" align="center">
                Powered by RideWave
              </mj-text>
              {{/unless}}
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>
    `,
  },
  password_reset: {
    subject: "Reset Your Password",
    mjml: `
      <mjml>
        <mj-head>
          <mj-title>Password Reset</mj-title>
          <mj-font name="Inter" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
          <mj-attributes>
            <mj-all font-family="Inter, Arial, sans-serif" />
          </mj-attributes>
        </mj-head>
        <mj-body background-color="{{backgroundColor}}">
          <mj-section background-color="{{primaryColor}}" padding="20px">
            <mj-column>
              {{#if tenantLogo}}
              <mj-image src="{{tenantLogo}}" alt="{{tenantName}}" width="150px" />
              {{else}}
              <mj-text color="white" font-size="24px" font-weight="bold" align="center">{{tenantName}}</mj-text>
              {{/if}}
            </mj-column>
          </mj-section>
          
          <mj-section background-color="white" padding="20px">
            <mj-column>
              <mj-text font-size="20px" font-weight="600" color="{{primaryColor}}">
                Reset Your Password
              </mj-text>
              
              <mj-text font-size="16px" color="#333333">
                Hi there,
              </mj-text>
              
              <mj-text font-size="16px" color="#333333">
                We received a request to reset your password. Click the button below to create a new password:
              </mj-text>
              
              <mj-button background-color="{{primaryColor}}" color="white" href="{{resetUrl}}">
                Reset Password
              </mj-button>
              
              <mj-text font-size="14px" color="#666666">
                If you didn't request this, please ignore this email. The link will expire in 24 hours.
              </mj-text>
            </mj-column>
          </mj-section>
          
          <mj-section background-color="#f8f9fa" padding="20px">
            <mj-column>
              <mj-text font-size="12px" color="#666666" align="center">
                © {{currentYear}} {{tenantName}}. All rights reserved.
              </mj-text>
              {{#unless whiteLabel}}
              <mj-text font-size="12px" color="#999999" align="center">
                Powered by RideWave
              </mj-text>
              {{/unless}}
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>
    `,
  },
  subscription_upgrade: {
    subject: "Subscription Upgraded Successfully!",
    mjml: `
      <mjml>
        <mj-head>
          <mj-title>Subscription Upgrade</mj-title>
          <mj-font name="Inter" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
          <mj-attributes>
            <mj-all font-family="Inter, Arial, sans-serif" />
          </mj-attributes>
        </mj-head>
        <mj-body background-color="{{backgroundColor}}">
          <mj-section background-color="{{primaryColor}}" padding="20px">
            <mj-column>
              {{#if tenantLogo}}
              <mj-image src="{{tenantLogo}}" alt="{{tenantName}}" width="150px" />
              {{else}}
              <mj-text color="white" font-size="24px" font-weight="bold" align="center">{{tenantName}}</mj-text>
              {{/if}}
            </mj-column>
          </mj-section>
          
          <mj-section background-color="white" padding="20px">
            <mj-column>
              <mj-text font-size="20px" font-weight="600" color="{{primaryColor}}">
                Subscription Upgraded!
              </mj-text>
              
              <mj-text font-size="16px" color="#333333">
                Congratulations! Your subscription has been upgraded to {{newTier}}.
              </mj-text>
              
              <mj-text font-size="16px" color="#333333">
                You now have access to all {{newTier}} features and increased limits.
              </mj-text>
              
              <mj-button background-color="{{primaryColor}}" color="white" href="{{billingUrl}}">
                View Billing Details
              </mj-button>
            </mj-column>
          </mj-section>
          
          <mj-section background-color="#f8f9fa" padding="20px">
            <mj-column>
              <mj-text font-size="12px" color="#666666" align="center">
                © {{currentYear}} {{tenantName}}. All rights reserved.
              </mj-text>
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>
    `,
  },
  subscription_payment_failed: {
    subject: "Payment Failed - Action Required",
    mjml: `
      <mjml>
        <mj-head>
          <mj-title>Payment Failed</mj-title>
          <mj-font name="Inter" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
          <mj-attributes>
            <mj-all font-family="Inter, Arial, sans-serif" />
          </mj-attributes>
        </mj-head>
        <mj-body background-color="{{backgroundColor}}">
          <mj-section background-color="#ef4444" padding="20px">
            <mj-column>
              {{#if tenantLogo}}
              <mj-image src="{{tenantLogo}}" alt="{{tenantName}}" width="150px" />
              {{else}}
              <mj-text color="white" font-size="24px" font-weight="bold" align="center">{{tenantName}}</mj-text>
              {{/if}}
            </mj-column>
          </mj-section>
          
          <mj-section background-color="white" padding="20px">
            <mj-column>
              <mj-text font-size="20px" font-weight="600" color="#ef4444">
                Payment Failed
              </mj-text>
              
              <mj-text font-size="16px" color="#333333">
                We were unable to process your subscription payment. Please update your payment method to continue using our services.
              </mj-text>
              
              <mj-text font-size="16px" color="#333333">
                Your account will be restricted until payment is resolved.
              </mj-text>
              
              <mj-button background-color="#ef4444" color="white" href="{{updatePaymentUrl}}">
                Update Payment Method
              </mj-button>
            </mj-column>
          </mj-section>
          
          <mj-section background-color="#f8f9fa" padding="20px">
            <mj-column>
              <mj-text font-size="12px" color="#666666" align="center">
                © {{currentYear}} {{tenantName}}. All rights reserved.
              </mj-text>
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>
    `,
  },
};

// Template variable handler (simple handlebars-like replacement)
function replaceTemplateVariables(template: string, variables: Record<string, any>): string {
  let result = template;
  
  // Simple variable replacement {{variable}}
  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || '';
  });
  
  // Conditional blocks {{#if variable}}...{{/if}}
  result = result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, content) => {
    return variables[key] ? content : '';
  });
  
  // Inverted conditional blocks {{#unless variable}}...{{/unless}}
  result = result.replace(/\{\{#unless (\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g, (match, key, content) => {
    return !variables[key] ? content : '';
  });
  
  return result;
}

// Email service class
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  /**
   * Get email template for a tenant
   */
  async getTemplate(tenantId: string, templateType: EmailTemplateType) {
    // First, try to get custom template
    const customTemplate = await prisma.emailTemplate.findFirst({
      where: {
        tenantId,
        type: templateType,
        isActive: true,
      },
    });

    if (customTemplate) {
      return {
        subject: customTemplate.subject,
        mjml: customTemplate.htmlContent,
        textContent: customTemplate.textContent,
      };
    }

    // Fall back to default template
    const defaultTemplate = DEFAULT_TEMPLATES[templateType];
    if (!defaultTemplate) {
      throw new Error(`Template not found: ${templateType}`);
    }

    return {
      subject: defaultTemplate.subject,
      mjml: defaultTemplate.mjml,
      textContent: null,
    };
  }

  /**
   * Send email using tenant's template
   */
  async sendEmail(
    tenantId: string,
    templateType: EmailTemplateType,
    to: string | string[],
    variables: Record<string, any>,
    options?: {
      from?: string;
      replyTo?: string;
      cc?: string | string[];
      bcc?: string | string[];
    }
  ) {
    // Check if tenant has email marketing access
    if (templateType !== "booking_confirmation" && templateType !== "payment_success") {
      const access = await SubscriptionService.hasServiceAccess(tenantId, ServiceType.EMAIL_MARKETING);
      if (!access.hasAccess) {
        throw new Error(`Email service not available: ${access.reason}`);
      }
    }

    // Get tenant info for branding
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        serviceAccess: {
          where: { serviceType: ServiceType.WHITE_LABELING },
        },
      },
    });

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // Check white labeling access
    const hasWhiteLabel = tenant.serviceAccess.some(access => 
      access.serviceType === ServiceType.WHITE_LABELING && access.isEnabled
    );

    // Get template
    const template = await this.getTemplate(tenantId, templateType);

    // Prepare template variables with tenant branding
    const templateVariables = {
      ...variables,
      tenantName: tenant.name,
      tenantLogo: tenant.logo,
      primaryColor: tenant.primaryColor,
      secondaryColor: tenant.secondaryColor,
      accentColor: tenant.accentColor,
      backgroundColor: "#f8f9fa",
      whiteLabel: hasWhiteLabel,
      currentYear: new Date().getFullYear(),
    };

    // Replace variables in subject and content
    const subject = replaceTemplateVariables(template.subject, templateVariables);
    const mjmlContent = replaceTemplateVariables(template.mjml, templateVariables);

    // Convert MJML to HTML
    const mjmlResult = mjml2html(mjmlContent, {
      validationLevel: "soft",
    });

    if (mjmlResult.errors.length > 0) {
      console.error("MJML compilation errors:", mjmlResult.errors);
    }

    // Send email
    const fromEmail = options?.from || `${tenant.name} <noreply@${tenant.domain || 'ridewave.com'}>`;
    
    const mailOptions = {
      from: fromEmail,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      html: mjmlResult.html,
      text: template.textContent || undefined,
      replyTo: options?.replyTo,
      cc: options?.cc,
      bcc: options?.bcc,
    };

    const result = await this.transporter.sendMail(mailOptions);

    // Increment email usage
    if (templateType !== "booking_confirmation" && templateType !== "payment_success") {
      await SubscriptionService.incrementServiceUsage(tenantId, ServiceType.EMAIL_MARKETING, 1);
    }

    // Update template sent count
    await prisma.emailTemplate.updateMany({
      where: {
        tenantId,
        type: templateType,
        isActive: true,
      },
      data: {
        sentCount: { increment: 1 },
        lastSentAt: new Date(),
      },
    });

    return result;
  }

  /**
   * Create or update a custom email template
   */
  async saveTemplate(
    tenantId: string,
    templateType: EmailTemplateType,
    data: {
      name: string;
      subject: string;
      htmlContent: string;
      textContent?: string;
      variables?: Record<string, any>;
    }
  ) {
    // Check email marketing access
    const access = await SubscriptionService.hasServiceAccess(tenantId, ServiceType.EMAIL_MARKETING);
    if (!access.hasAccess) {
      throw new Error(`Email template customization not available: ${access.reason}`);
    }

    // Validate MJML
    const mjmlResult = mjml2html(data.htmlContent, {
      validationLevel: "strict",
    });

    if (mjmlResult.errors.length > 0) {
      throw new Error(`Invalid MJML template: ${mjmlResult.errors[0].message}`);
    }

    return await prisma.emailTemplate.create({
      data: {
        tenantId,
        type: templateType,
        name: data.name,
        subject: data.subject,
        htmlContent: data.htmlContent,
        textContent: data.textContent,
        variables: data.variables,
        isActive: true,
        isDefault: false,
      },
    });
  }

  /**
   * Get all templates for a tenant
   */
  async getTemplates(tenantId: string) {
    const customTemplates = await prisma.emailTemplate.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    // Include default templates that don't have custom versions
    const customTypes = customTemplates.map(t => t.type);
    const allTypes = Object.keys(DEFAULT_TEMPLATES) as EmailTemplateType[];
    const defaultTemplates = allTypes
      .filter(type => !customTypes.includes(type))
      .map(type => ({
        id: `default_${type}`,
        type,
        name: DEFAULT_TEMPLATES[type].subject,
        subject: DEFAULT_TEMPLATES[type].subject,
        isDefault: true,
        isActive: true,
        sentCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

    return [...customTemplates, ...defaultTemplates];
  }

  /**
   * Preview template with sample data
   */
  async previewTemplate(
    tenantId: string,
    templateType: EmailTemplateType,
    sampleData?: Record<string, any>
  ) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const template = await this.getTemplate(tenantId, templateType);

    // Use sample data or defaults
    const variables = {
      passengerName: "John Doe",
      bookingReference: "BK123456",
      fromCity: "New York",
      toCity: "Boston",
      departureDate: "2024-02-15",
      departureTime: "10:30 AM",
      seatCount: "2",
      seatNumbers: "A1, A2",
      totalAmount: "$45.00",
      tenantName: tenant.name,
      tenantLogo: tenant.logo,
      primaryColor: tenant.primaryColor,
      secondaryColor: tenant.secondaryColor,
      accentColor: tenant.accentColor,
      backgroundColor: "#f8f9fa",
      whiteLabel: false,
      currentYear: new Date().getFullYear(),
      ...sampleData,
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    const mjmlContent = replaceTemplateVariables(template.mjml, variables);

    const mjmlResult = mjml2html(mjmlContent, {
      validationLevel: "soft",
    });

    return {
      subject,
      html: mjmlResult.html,
      errors: mjmlResult.errors,
    };
  }
}