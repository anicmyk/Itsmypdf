import { FileText, Shield, Zap, Users } from 'lucide-react';

export default function AboutPage() {
  return (
      

      <div className="min-h-screen bg-white py-10 sm:py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">About itsmypdf</h1>
            <p className="text-base sm:text-xl text-gray-600">
              Making PDF processing simple, secure, and accessible to everyone
            </p>
          </div>

          <div className="prose prose-lg max-w-none">
            <div className="bg-blue-50 rounded-lg p-6 sm:p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
              <p className="text-gray-700">
                We believe that PDF processing should be free, secure, and accessible to everyone. That's why we've created a comprehensive platform of professional PDF tools that work entirely in your browser - no uploads, no registration, no tracking.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 mb-12">
              <div className="bg-white border border-gray-200 rounded-lg p-5 sm:p-6">
                <Shield className="h-8 w-8 text-blue-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">100% Private & Secure</h3>
                <p className="text-gray-600">
                  All file processing happens directly in your browser. Your files never leave your device, ensuring complete privacy and security.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-5 sm:p-6">
                <Zap className="h-8 w-8 text-blue-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Instant Processing</h3>
                <p className="text-gray-600">
                  No uploads, no waiting. Process your PDFs instantly with our advanced browser-based technology.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-5 sm:p-6">
                <FileText className="h-8 w-8 text-blue-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Professional PDF Tools</h3>
                <p className="text-gray-600">
                  From merging and splitting to converting and editing, we cover all your PDF needs with professional-grade tools.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-5 sm:p-6">
                <Users className="h-8 w-8 text-blue-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Completely Free</h3>
                <p className="text-gray-600">
                  All tools are free to use with no hidden fees, subscriptions, or registration requirements. Ever.
                </p>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Why Choose Our Platform?</h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <p className="text-gray-700">
                    <strong>No Registration Required:</strong> Start using our tools immediately without creating an account or providing personal information.
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <p className="text-gray-700">
                    <strong>Cross-Platform Compatibility:</strong> Works on any device with a modern web browser - Windows, Mac, Linux, mobile, and tablet.
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <p className="text-gray-700">
                    <strong>Professional Quality:</strong> Our tools deliver results that match or exceed what you'd get from expensive desktop software.
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <p className="text-gray-700">
                    <strong>Continuous Updates:</strong> We regularly add new features and tools based on user feedback and emerging needs.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Get in Touch</h2>
              <p className="text-gray-700 mb-4">
                Have questions, suggestions, or need help? We'd love to hear from you!
              </p>
              <p className="text-gray-600">
                Email us at: <a href="mailto:contact@itsmypdf.com" className="text-blue-600 hover:text-blue-700">contact@itsmypdf.com</a>
              </p>
            </div>
          </div>
        </div>
      </div>
  );
}
