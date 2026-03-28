
export default function PrivacyPage() {
  return (
      

      <div className="min-h-screen bg-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
            <p className="text-gray-600">Last updated: January 2026</p>
          </div>

          <div className="prose prose-lg max-w-none">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-green-800 mb-2">Privacy Commitment</h2>
              <p className="text-green-700">
                We are committed to protecting your privacy. All PDF processing happens locally in your browser - we never see, store, or access your files.
              </p>
            </div>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">What We Don't Do</h2>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                  <p className="text-gray-700"><strong>We don't store your files</strong> - All processing happens in your browser</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                  <p className="text-gray-700"><strong>We don't track your activity</strong> - No analytics or user tracking</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                  <p className="text-gray-700"><strong>We don't access your data</strong> - Your files never leave your device</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                  <p className="text-gray-700"><strong>We don't collect personal information</strong> - No registration or accounts required</p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">How Our Service Works</h2>
              <div className="bg-blue-50 rounded-lg p-6">
                <p className="text-gray-700 mb-4">
                  Our PDF processing tools work entirely in your browser using advanced JavaScript technology:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>You upload files directly to your browser</li>
                  <li>JavaScript processes the files locally</li>
                  <li>The processed files are available for download</li>
                  <li>No data is transmitted to our servers</li>
                </ol>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Information We Collect</h2>
              <p className="text-gray-700 mb-4">
                We collect minimal information necessary to operate our service:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li><strong>Usage Statistics:</strong> Anonymous, aggregated data about which tools are most popular</li>
                <li><strong>Error Logs:</strong> Basic information about technical issues to improve our service</li>
                <li><strong>Contact Information:</strong> Only if you voluntarily contact us via email</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookies and Local Storage</h2>
              <p className="text-gray-700">
                We may use cookies or local storage to improve your experience, such as remembering your preferences. These are stored locally on your device and can be cleared at any time through your browser settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Third-Party Services</h2>
              <p className="text-gray-700">
                We may use third-party services for hosting and analytics, but these services are configured to not access or store your personal files or data. Any analytics data is anonymized and aggregated.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Security</h2>
              <p className="text-gray-700">
                Since all processing happens in your browser, your data security is maintained by your own device and browser security. We recommend:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 mt-4">
                <li>Keeping your browser updated</li>
                <li>Using secure connections (HTTPS)</li>
                <li>Clearing browser data regularly if sharing devices</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Children's Privacy</h2>
              <p className="text-gray-700">
                Our service is suitable for all ages. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to This Policy</h2>
              <p className="text-gray-700">
                We may update this privacy policy from time to time. Any changes will be posted on this page with an updated "Last updated" date. We encourage you to review this policy periodically.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-700">
                If you have any questions about this privacy policy or our data practices, please contact us at:
              </p>
              <div className="bg-gray-50 rounded-lg p-6 mt-4">
                <p className="text-gray-700">
                  <strong>Email:</strong> <a href="mailto:contact@itsmypdf.com" className="text-blue-600 hover:text-blue-700">contact@itsmypdf.com</a>
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
  );
}
