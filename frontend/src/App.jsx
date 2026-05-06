import { useState, useCallback } from 'react'
import Navbar from './components/Navbar.jsx'
import DomainBar from './components/DomainBar.jsx'
import Stepper from './components/Stepper.jsx'
import Step1Clinical from './components/Step1Clinical.jsx'
import Step2Upload from './components/Step2Upload.jsx'
import Step3Prepare from './components/Step3Prepare.jsx'
import Step4Model from './components/Step4Model.jsx'
import Step5Results from './components/Step5Results.jsx'
import Step6Explain from './components/Step6Explain.jsx'
import Step7Ethics from './components/Step7Ethics.jsx'

const STEPS = [
  { n: 1, label: 'Clinical Context',  short: 'Domain' },
  { n: 2, label: 'Data Upload',       short: 'Upload' },
  { n: 3, label: 'Data Preparation',  short: 'Prepare' },
  { n: 4, label: 'Model & Parameters',short: 'Model' },
  { n: 5, label: 'Results',           short: 'Results' },
  { n: 6, label: 'Explainability',    short: 'Explain' },
  { n: 7, label: 'Ethics & Bias',     short: 'Ethics' },
]

export default function App() {
  const [step, setStep]           = useState(1)
  const [doneUpTo, setDoneUpTo]   = useState(0)
  const [domainKey, setDomainKey] = useState('cardiology')
  const [domainInfo, setDomainInfo] = useState(null)
  const [uploadInfo, setUploadInfo] = useState(null)
  const [prepInfo, setPrepInfo]   = useState(null)
  const [metrics, setMetrics]     = useState(null)

  const advance = useCallback((n) => {
    setDoneUpTo(prev => Math.max(prev, n))
    setStep(n + 1)
  }, [])

  const goTo = useCallback((n) => {
    if (n <= doneUpTo + 1) setStep(n)
  }, [doneUpTo])

  const handleReset = useCallback(() => {
    setStep(1)
    setDoneUpTo(0)
    setUploadInfo(null)
    setPrepInfo(null)
    setMetrics(null)
  }, [])

  return (
    <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
      <Navbar
        domainInfo={domainInfo}
        domainKey={domainKey}
        onReset={handleReset}
      />

      <div style={{ maxWidth: 1360, margin: '0 auto', padding: '16px 20px 80px' }}>
        <DomainBar
          domainKey={domainKey}
          onChange={(key, info) => {
            setDomainKey(key); setDomainInfo(info)
            setStep(1); setDoneUpTo(0)
            setUploadInfo(null); setPrepInfo(null); setMetrics(null)
          }}
        />

        <Stepper steps={STEPS} current={step} doneUpTo={doneUpTo} onGo={goTo} />

        <div className="fade-in" key={step}>
          {step === 1 && (
            <Step1Clinical
              domainKey={domainKey}
              onDomainChange={(key, info) => { setDomainKey(key); setDomainInfo(info) }}
              onContinue={() => advance(1)}
            />
          )}
          {step === 2 && (
            <Step2Upload
              domainKey={domainKey}
              onDone={(info) => { setUploadInfo(info); advance(2) }}
            />
          )}
          {step === 3 && (
            <Step3Prepare
              uploadInfo={uploadInfo}
              onDone={(info) => { setPrepInfo(info); advance(3) }}
            />
          )}
          {step === 4 && (
            <Step4Model
              prepInfo={prepInfo}
              onDone={(m) => { setMetrics(m); advance(4) }}
            />
          )}
          {step === 5 && (
            <Step5Results
              metrics={metrics}
              domainKey={domainKey}
              onContinue={() => advance(5)}
            />
          )}
          {step === 6 && (
            <Step6Explain
              domainKey={domainKey}
              onContinue={() => advance(6)}
            />
          )}
          {step === 7 && (
            <Step7Ethics domainKey={domainKey} metrics={metrics} />
          )}
        </div>
      </div>
    </div>
  )
}
